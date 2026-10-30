# 0026 — Pin Prisma's engine binary target(s) for the production host

Date: 2026-10-30
Status: accepted, with a correction below

**Correction**: `rhel-openssl-3.0.x` alone was not enough. The first real
deploy's actual runtime error — from inside the live Passenger-spawned
Node process, not a shell-level probe — asked for `debian-openssl-1.1.x`
instead. With `/etc/os-release` hidden by CageFS, Prisma's own platform
detection can't confirm RHEL at runtime and falls back to its generic
glibc-Linux ("debian") family; whatever `libssl` the Node process
actually links against turned out to be 1.1.x, not the system `openssl`
CLI's 3.5.8 this ADR reasoned from. Both targets are now kept rather
than replacing one guess with another — see Consequences. Left as a
record of a reasonable-but-incomplete diagnosis, per the same practice
as ADR 0023/0028.

## Context

`ci.yml` runs `prisma generate` on a GitHub-hosted `ubuntu-latest`
runner, with no `binaryTargets` configured in `prisma/schema.prisma`.
Prisma's default "native" target auto-detects the OS it's running on —
on that runner, a Debian-family engine binary. The generated
`node_modules/.prisma/client` (including the native engine) is then
shipped inside the release artifact and run unmodified on the
production host.

The host's facts, gathered via `docs/deploy/host-facts.md` and
confirmed from the user's own Terminal output:

- `uname -a` → kernel `5.14.0-687.38.1.el9_8.x86_64` — the `el9` tag
  means Enterprise Linux 9, i.e. **RHEL-family**, not Debian-family.
- `/opt/alt/alt-nodejs20` exists — CloudLinux's "alt-stack" naming
  convention, which is specific to CloudLinux. The host is CloudLinux 9.
- `openssl version` → `OpenSSL 3.5.8`.

A Debian-built engine binary does not run on a RHEL-family host. This
would have failed exactly as `DEPLOYMENT.md`'s troubleshooting table
describes: `Error loading shared library` / `Unable to require
libquery_engine...` — on the first real deploy, discovered only after
the artifact had already been built, shipped, and unpacked.

## Decision

Set
`binaryTargets = ["native", "rhel-openssl-3.0.x", "debian-openssl-1.1.x"]`
on the `client` generator in `prisma/schema.prisma`.

- `debian-openssl-1.1.x` is what the host's own runtime error named
  explicitly, and is kept as the authoritative answer — it came from
  the actual failure, not a shell-level inference.
- `rhel-openssl-3.0.x` is kept too rather than removed: the `uname`/
  `openssl` evidence for a RHEL-family, OpenSSL-3.x host is still real,
  even though Prisma's own runtime probe doesn't resolve to it here.
  Carrying both costs a few extra MB and removes the guessing — correct
  per prior reasoning or correct per the live error either way.
- `native` is kept so `prisma generate` still produces a binary that
  runs wherever it's generated — this repo's own Windows dev machine,
  or any other contributor's — without needing this list touched again
  for local development.

## Consequences

- The release artifact now carries three engine binaries instead of
  one; still a few extra MB, immaterial next to fixing the
  `.next/cache` packaging bug in the same phase (see
  `docs/decisions/0025-migration-rehearsal-waived-fresh-install-instead.md`).
- Not yet confirmed: whether `debian-openssl-1.1.x` is actually the
  right one the live Passenger process loads, or whether another
  surprise is still waiting — the next deploy with all three targets
  present is the real test.
- If the host is ever moved to a different OS family, or OpenSSL's
  major version on it changes, this list needs a matching update —
  `docs/deploy/host-facts.md` §1 is where to re-check that before any
  future host migration. A CLI-level `openssl version` check on this
  host is **not reliable evidence of the binary target Prisma's runtime
  needs** — confirm from an actual deploy's error (or success) instead.
- Verified locally: `npx prisma generate` fetched all three engine
  binaries into `node_modules/.prisma/client`, and the full
  `npm run verify` suite stayed green.
