// Ambient global declarations.
//
// Phase 1 of the audit replaced bare-identifier reads against globalThis
// with ES module imports via adventures-state.ts. The ambient block
// shrank from 38 → 2 names. Anything else previously declared here is
// now imported through the typed binding.
//
// What stays:
//   - AnyObj: site-wide shorthand for crossing the typed/untyped boundary
//     (DOM nodes, JSON-parsed records). Used in 189 places.
//   - L: Leaflet vendor bundle attaches to window.L — never imported as
//     an ES module, so the type binding lives here.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyObj = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const L: any;
}

export {};
