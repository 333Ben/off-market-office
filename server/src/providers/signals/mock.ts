// Default SignalProvider. Signals come from the seed + POST /api/simulate/signal,
// so the live stream emits nothing on its own.

import type { Signal } from "../../types";
import type { SignalProvider } from "./index";

export class MockSignalProvider implements SignalProvider {
  start(_onSignal: (s: Signal) => void): void {
    // no-op: seed + simulate endpoint drive signals in the demo.
  }
  stop(): void {}
}
