# IMSpeed Performance Qualification

Run the same feature prompt from the same clean repository commit with
Superpowers 6.1.1 and IMSpeed 0.1.0. Keep permissions, dependencies, network
state, and test commands identical. Run every scenario three times per
workflow. Record one JSON object per run with:

`scenario`, `workflow`, `durationMs`, `inputTokens`, `outputTokens`,
`testsPassed`, `criticalOpen`, and `importantOpen`.

Summarize results with:

```bash
node scripts/summarize-benchmark.mjs benchmarks/results.jsonl
```

IMSpeed is performance-qualified only when `qualified` is true. Full benchmark
runs consume substantial model tokens and require explicit user approval before
execution. Do not claim the target from static tests or a single run.
