# 0005: Prisma `binaryTargets` left at the default, pending host OpenSSL info

## Context

`prisma/schema.prisma` has no `binaryTargets` set, so `prisma generate`
produces only the `native` engine binary for whatever machine runs it. The
CI build job runs on a GitHub-hosted `ubuntu-latest` runner and ships the
resulting `node_modules` (including the compiled query-engine binary) to the
cPanel host. If the host's OpenSSL ABI doesn't match `ubuntu-latest`'s,
Prisma fails at runtime with a shared-library load error — this is exactly
why the master plan's Phase 1 task list says to detect the host's OpenSSL
version and record the result, rather than guess.

## Decision

Not resolved yet. Asked the human to run `openssl version` and
`cat /etc/os-release` on the actual host (`docs/deploy/host-facts.md` §1) —
I can't connect to the production server myself. Left `binaryTargets` unset
for now rather than guessing a value, since a wrong guess produces the exact
same failure as not setting it at all, just more confusingly (looks
deliberate when it isn't).

## Consequences

- **The deploy pipeline's first real run will very likely fail at app boot**
  with a Prisma engine error, until this is resolved — expected, not a sign
  the pipeline itself is broken. Once the host facts come back, update
  `generator client { binaryTargets = [...] }` in `prisma/schema.prisma`,
  regenerate the Prisma client locally to confirm it still works, and this
  ADR gets superseded by a follow-up one recording the actual value chosen
  and why.
- Until resolved, don't trust a "successful" CI build as proof the app will
  actually boot on the host — CI only proves the Next.js build itself
  succeeds, not that the shipped Prisma binary is compatible.
