# 0026 — Pin Prisma's engine binary target to `rhel-openssl-3.0.x`

Date: 2026-10-30
Status: accepted

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

Set `binaryTargets = ["native", "rhel-openssl-3.0.x"]` on the `client`
generator in `prisma/schema.prisma`.

- `rhel-openssl-3.0.x` is the binary CI now also generates and ships;
  it is what the production host actually runs. Prisma groups engine
  binaries by OpenSSL **major** version, not minor — there is no
  separate "3.5" target, and 3.0.x covers every OpenSSL 3.x release.
- `native` is kept so `prisma generate` still produces a binary that
  runs wherever it's generated — this repo's own Windows dev machine,
  or any other contributor's — without needing this list touched again
  for local development.

## Consequences

- The release artifact now carries two engine binaries instead of one;
  this is a few extra MB, immaterial next to fixing the `.next/cache`
  packaging bug in the same phase (see
  `docs/decisions/0025-migration-rehearsal-waived-fresh-install-instead.md`).
- If the host is ever moved to a different OS family, or OpenSSL's
  major version on it changes, this list needs a matching update —
  `docs/deploy/host-facts.md` §1 is where to re-check that before any
  future host migration.
- Verified locally: `npx prisma generate` fetched
  `libquery_engine-rhel-openssl-3.0.x.so.node` into
  `node_modules/.prisma/client` alongside the Windows native engine,
  and the full `npm run verify` suite stayed green.
- Not verified: the actual binary running on the host, which needs a
  real deploy. This fixes a defect that host-facts.md's own stated
  purpose exists to catch — it was gathered specifically for this phase
  rather than deferred, because the user was mid-way through readying a
  real first deploy.
