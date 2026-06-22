---
paths: ["src/lib/**/*"]
---
# Date Handling

`@db.Date` fields are stored as UTC midnight. Always construct comparison dates with
`toUtcDate(dateStr)` from `@/lib/utils/dates`. Never use `new Date('YYYY-MM-DD')`
(shifts by local timezone offset) or `new Date()` (includes a time component, so
"today" comparisons silently exclude same-day rows after midnight UTC).
