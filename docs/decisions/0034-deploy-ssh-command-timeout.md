# 0034 — Raise the deploy SSH steps' command timeout

Date: 2026-10-30
Status: accepted

## Context

With the Prisma binary target fixed (ADR 0026's correction) and a new
`ci` run green, the next deploy attempt failed at a different step:

```
2026/10/30 11:51:25 Process exited with status 137 from signal KILL
```

during "Unpack the release" — `tar -xzf incoming/release.tar.gz`.
Status 137 is SIGKILL (128 + signal 9).

Checked directly on the host rather than guessed:

- `free -h`: 124GB total RAM, 42GB available at the time. Not a memory
  shortage.
- `ulimit -a`: nothing restrictive — `max user processes` in the
  hundreds of thousands, virtual memory unlimited, file size unlimited.
- The stuck `incoming/release.tar.gz` was still present (the script only
  removes it after a successful extraction): **316MB**.
- The partially-extracted release directory had already reached
  **1.1GB** before the kill — real progress, not a hang, just not
  enough of it in the time given.

`appleboy/ssh-action` defaults `command_timeout` to `10m`. The release
artifact ships a full production `node_modules` — `output: "standalone"`
is deliberately not used (`ARCHITECTURE.md`: `server.js` runs against a
full install, standalone's extra file-tracing build step is pure
overhead here) — which means tens of thousands of small files to
extract. Shared hosting commonly throttles I/O operations per account
even when RAM itself isn't short, and `tar` extracting that many small
files is dominated by per-file filesystem operations, not raw
throughput. 1.1GB in under 10 minutes on this host, with everything
else (artifact upload, directory setup) completing quickly in earlier
steps, points at exactly that: slow for many-small-files, not slow
overall.

## Decision

Set `command_timeout: 30m` on the "Unpack the release" step and the
final "Migrate, switch, restart, smoke-test" step in
`.github/workflows/deploy.yml`. Left the first step ("Ensure the
release/shared directories exist") at the default — it only runs
`mkdir`/a file-existence check, nothing that scales with artifact size.

30 minutes rather than a tighter estimate: there's no real cost to
over-provisioning a timeout (the step finishes as soon as it's actually
done, not after the full budget), while under-provisioning costs an
entire deploy cycle to discover, as this one did.

## Consequences

- Not verifiable locally — this is specific to this host's I/O
  characteristics under load, same category as ADR 0026's binary target
  and ADR 0033's `node` path, both found only by an actual deploy
  attempt. The next deploy run is the real test.
- If extraction still doesn't finish in 30 minutes, the real fix is
  reducing what's shipped (e.g. revisiting `output: "standalone"`, or a
  different transfer/unpack strategy) rather than raising the timeout
  further — 30 minutes for ~1GB of small files would itself indicate
  something worth investigating properly, not working around again.
- The stuck 316MB `incoming/release.tar.gz` and the partial 1.1GB
  extraction directory from the failed attempt were left on the host —
  both get overwritten cleanly by the next deploy's upload/extract (scp
  overwrites by default; `tar -xzf` into the same `RELEASE_DIR` for the
  same SHA just re-extracts the identical content), so no manual
  cleanup was necessary before retrying.
