# Keyword baseline 1

Frozen candidate before scoring: lower-case the same submitted title and description, normalize whitespace. Whole word `demolish` or phrase `remove and replace` → P0; otherwise phrase `additional work` or whole word `relocate` → P1; otherwise P2. Implementation `baseline()` in js/demo2-core.js.

Intentionally weak: no negation, contextual protection, attachments, scope or abstention. It does not use outcome fields, human predicates, labels or AI output. The AI sees the same record packet but can use supporting text; this baseline reads title/description only. Disclose this algorithmic limitation rather than claiming a best non-AI comparison. FIFO belongs to a separate ordering/task-time study.
