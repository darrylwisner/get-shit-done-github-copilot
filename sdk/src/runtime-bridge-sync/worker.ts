/**
 * Synckit worker for executeForCjs.
 *
 * Loaded by synckit's worker pool. Constructs a native-only QueryRuntimeBridge
 * lazily (once per worker lifetime) and handles async execution, projecting
 * results into the RuntimeBridgeSyncResult discriminated union.
 *
 * The bridge is configured with:
 * - allowFallbackToSubprocess: false — keeps the worker self-contained with no
 *   child-process spawning. Unknown commands surface as 'unknown_command' errors.
 * - strictSdk: false — lets the transport surface 'unknown_command' rather than
 *   throwing before dispatch.
 */
import { runAsWorker } from 'synckit';
import { createRegistry } from '../query/index.js';
import { GSDTransport } from '../gsd-transport.js';
import { QueryExecutionPolicy } from '../query-execution-policy.js';
import { QueryNativeDirectAdapter } from '../query-native-direct-adapter.js';
import { QueryNativeHotpathAdapter } from '../query-native-hotpath-adapter.js';
import { QueryRuntimeBridge } from '../query-runtime-bridge.js';
import { GSDToolsError } from '../gsd-tools-error.js';
import { GSDError, ErrorClassification } from '../errors.js';
import { createQueryNativeErrorFactory } from '../query-tools-error-factory.js';
import type { RuntimeBridgeExecuteInput } from '../query-runtime-bridge.js';
import type { RuntimeBridgeSyncResult, SyncErrorKind } from './index.js';

// ─── Lazy bridge singleton ──────────────────────────────────────────────────

let bridgeInstance: QueryRuntimeBridge | null = null;

function getBridge(): QueryRuntimeBridge {
  if (bridgeInstance) return bridgeInstance;

  const registry = createRegistry();

  const NATIVE_TIMEOUT_MS = 30_000; // 30 s ceiling for any single handler
  const nativeErrorFactory = createQueryNativeErrorFactory(NATIVE_TIMEOUT_MS);

  const nativeDirectAdapter = new QueryNativeDirectAdapter({
    timeoutMs: NATIVE_TIMEOUT_MS,
    dispatch: (registryCommand, registryArgs) =>
      registry.dispatch(registryCommand, registryArgs, ''),
    ...nativeErrorFactory,
  });

  const transport = new GSDTransport(registry, {
    dispatchNative: (request) =>
      nativeDirectAdapter.dispatchResult(
        request.legacyCommand,
        request.legacyArgs,
        request.registryCommand,
        request.registryArgs,
      ),
    // Subprocess fallback stubs — never called because allowFallbackToSubprocess=false
    execSubprocessJson: () =>
      Promise.reject(new Error('Subprocess fallback disabled in sync bridge worker')),
    execSubprocessRaw: () =>
      Promise.reject(new Error('Subprocess fallback disabled in sync bridge worker')),
  });

  const executionPolicy = new QueryExecutionPolicy(transport);

  // Hotpath adapter stubs — dispatchHotpath is not called by executeForCjs
  const hotpathAdapter = new QueryNativeHotpathAdapter(
    () => true,
    nativeDirectAdapter,
    () => Promise.reject(new Error('hotpath json fallback disabled')),
    () => Promise.reject(new Error('hotpath raw fallback disabled')),
  );

  bridgeInstance = new QueryRuntimeBridge(
    registry,
    executionPolicy,
    hotpathAdapter,
    () => true, // always prefer native
    {
      allowFallbackToSubprocess: false,
      strictSdk: false,
    },
  );

  return bridgeInstance;
}

// ─── Error classification ───────────────────────────────────────────────────

/**
 * Map a caught error into the 6-kind ADR-0001 error taxonomy.
 *
 * GSDToolsError.classification.kind: 'timeout' | 'failure'
 * GSDError.classification: ErrorClassification enum
 *
 * Mapping:
 * - 'Subprocess fallback disabled' message → unknown_command (no native adapter for command)
 * - GSDToolsError timeout kind → native_timeout
 * - GSDError Validation → validation_error
 * - GSDError Blocked → validation_error (semantic: prerequisite missing)
 * - TypeError (programming error) → internal_error
 * - GSDToolsError failure + TypeError cause → internal_error
 * - GSDToolsError failure → native_failure
 * - Unknown Error → internal_error
 */
function classifyError(error: unknown): { kind: SyncErrorKind; exitCode: number; message: string } {
  if (error instanceof GSDToolsError) {
    const { classification, exitCode, message } = error;

    // Unknown command: transport throws 'Subprocess fallback disabled: command ... cannot run without native dispatch'
    if (
      classification.kind === 'failure' &&
      message.includes('Subprocess fallback disabled:') &&
      message.includes('cannot run without native dispatch')
    ) {
      return { kind: 'unknown_command', exitCode: exitCode ?? 1, message };
    }

    if (classification.kind === 'timeout') {
      return { kind: 'native_timeout', exitCode: exitCode ?? 1, message };
    }

    // Check if cause is a TypeError → internal_error
    const cause = (error as NodeJS.ErrnoException & { cause?: unknown }).cause;
    if (cause instanceof TypeError) {
      return { kind: 'internal_error', exitCode: exitCode ?? 1, message };
    }

    return { kind: 'native_failure', exitCode: exitCode ?? 1, message };
  }

  if (error instanceof GSDError) {
    const { classification, message } = error;
    if (
      classification === ErrorClassification.Validation ||
      classification === ErrorClassification.Blocked
    ) {
      return { kind: 'validation_error', exitCode: 10, message };
    }
    return { kind: 'internal_error', exitCode: 1, message };
  }

  if (error instanceof TypeError) {
    const message = error.message;
    return { kind: 'internal_error', exitCode: 1, message };
  }

  const message = error instanceof Error ? error.message : String(error);
  return { kind: 'internal_error', exitCode: 1, message };
}

// ─── Worker entry point ─────────────────────────────────────────────────────

runAsWorker(async (input: RuntimeBridgeExecuteInput): Promise<RuntimeBridgeSyncResult> => {
  const bridge = getBridge();

  try {
    const data = await bridge.execute(input);
    return { ok: true, data, exitCode: 0 };
  } catch (error: unknown) {
    const { kind, exitCode, message } = classifyError(error);
    return {
      ok: false,
      exitCode,
      errorKind: kind,
      errorDetails: { message },
      stderrLines: [],
    };
  }
});
