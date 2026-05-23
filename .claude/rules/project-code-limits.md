---
paths: ["src/**/*"]
---
# Code Size Limits

- Component: max 80 lines — extract child components when over
- Function or custom hook: max 25 lines — extract helpers when over
- File: max 200 lines — split at logical seams when over
- Props interface: max 8 props — compose with sub-interfaces or split components
- Inline JSX expressions: max 3 lines — extract to a named variable or component

These limits exist to keep diffs reviewable and components testable in isolation.
If a function genuinely requires more lines, leave a comment explaining why.
