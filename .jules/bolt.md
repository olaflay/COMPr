## 2024-05-18 - Avoid Derived State with useEffect
**Learning:** In large React components, calculating derived state (like prediction sizes based on file selection) using `useEffect` and `useState` causes an unnecessary double-render cycle. The first render commits, then the effect runs, updates the state, and triggers a second render.
**Action:** Always prefer `useMemo` for derived state calculations that depend purely on props or other state variables. This eliminates the extra render pass and improves UI responsiveness.
