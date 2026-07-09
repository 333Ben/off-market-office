// SignalProvider adapter (§9). Real Sillage/BODACC schemas are NOT invented —
// only the mock is implemented until the human wires real docs + keys.

import type { Signal } from "../../types";

export interface SignalProvider {
  /** Subscribe to live signals. Mock emits nothing by default. */
  start(onSignal: (s: Signal) => void): void;
  stop?(): void;
}

export { MockSignalProvider } from "./mock";
