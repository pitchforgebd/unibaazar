# 0009: Prisma Rust-free client spike — defer adoption, don't attempt yet

## Context

Master plan §2.1: _"One spike is worth doing in P2: Prisma's Rust-free client with
a MySQL/MariaDB driver adapter (the default in Prisma 7). It removes the native
query-engine binary, which is the root cause of the cold-start and thread problems
on this host. Adopt it only if it passes a smoke test on the real host. Record the
result as an ADR either way."_

This project is on Prisma 6.19.3 with the default Rust query engine
(`prisma-client-js` generator, `node_modules/@prisma/.prisma/client`). The
cold-start/thread problem this would fix is real and already documented
(`ARCHITECTURE.md` §12): a freshly-spawned `node`/`tsx` process reliably crashes
trying to start the Rust query engine on this host's ~5-thread ceiling; it only
works inside the already-running, warm Passenger process. It's also the open
question in `docs/decisions/0005-prisma-binary-target-pending.md` — if driver
adapters removed the native binary entirely, that ADR's "which `binaryTargets`
matches the host's OpenSSL" question would become moot.

## What the spike found

Researched the actual Prisma 6→7 driver-adapter migration (not just "add an
adapter package") and it's substantially more invasive than the master plan's
one-line description suggests:

1. **MySQL/MariaDB adapter confirmed to exist**: `@prisma/adapter-mariadb`
   (`PrismaMariaDb` class), works against MySQL. Only published as a Prisma 7
   package — no stable 6.x release — so this isn't addable to the current
   6.19.3 client as an incremental preview feature; it requires the **Prisma 7
   major upgrade**, not a config flag on 6.x.
2. **Prisma 7 requires the whole project to be ESM** (`"type": "module"` in
   `package.json`, `moduleResolution: "bundler"`, `target: "ES2023"`). This is
   the finding that changes the risk calculus: `server.js`, `seo-hook.cjs`, and
   `scripts/bootstrap-admin.cjs` are **deliberately plain CommonJS** today,
   specifically because that avoids the extra OS threads TypeScript/esbuild/tsx
   need to cold-start on this exact host (ARCHITECTURE.md §12, §9). Forcing ESM
   project-wide to fix one thread problem risks reopening the other one these
   files were written to avoid. Whether Node's ESM loader behaves safely under
   this host's thread ceiling is an open question this spike can't answer
   without the host.
3. **Generator and import paths change**: `prisma-client-js` → `prisma-client`,
   a `output` path becomes required, the client is no longer generated into
   `node_modules` by default. Every file importing `@prisma/client` (100+ files
   across this codebase: `import type { Prisma } from "@prisma/client"`, `import
{ prisma } from "@/lib/db"`, etc.) would need its import path updated — purely
   mechanical, but wide-reaching.
4. **`PrismaClient` construction changes**: `datasources`/`datasourceUrl` options
   are removed; a driver adapter instance is required
   (`new PrismaClient({ adapter })`). `src/lib/db/index.ts` (the one place the
   client is constructed) would need rewriting, which is small and contained —
   this part alone would be a reasonable, low-risk change if it were the only one.
5. **`.env` files are no longer auto-loaded** in Prisma 7 — needs explicit
   `dotenv` wiring in a new `prisma.config.ts`. This interacts with the
   Phase 1 deploy pipeline (`shared/.env`, symlinked into each release) and
   with `scripts/deploy/apply-migrations.sh`/`backup-db.mjs`, which currently
   parse `.env` directly with their own regex, not via Prisma's env loading —
   those scripts are unaffected, but anything that _does_ rely on Prisma's
   auto-load (none currently does, since `DATABASE_URL` is read via
   `process.env` already by Next.js's own env loading) needs re-checking.
6. **SSL certificate validation becomes strict** (no longer silently ignored,
   since the Rust engine is gone) — could surface a `P1010` error against the
   production MySQL instance that the current Rust-engine setup doesn't hit.
   Unknown without testing against the real host's MySQL/SSL configuration.
7. Removed features not currently used by this codebase (`$use` middleware,
   metrics, automatic `migrate dev` seeding) — no impact either way, but
   confirms this is a real major-version migration, not a drop-in swap.

## Decision

**Do not attempt this migration during Phase 2.** The master plan's own version
policy (§2.1: "don't upgrade major versions for their own sake") and explicit gate
("adopt only if it passes a smoke test on the real host") both point the same
direction once the true scope is known: this is a multi-file, ESM-forcing, major
Prisma upgrade with at least one finding (point 2 above) that could interact badly
with an existing host-specific workaround, and the one environment that can
actually validate it — the production host — isn't something this session can
reach.

## Consequences

- `docs/decisions/0005-prisma-binary-target-pending.md`'s OpenSSL-version question
  is still live and still needs the host facts (`docs/deploy/host-facts.md` §1) —
  this spike doesn't resolve it, since Prisma stays on the Rust engine for now.
- When the host facts eventually come in (before the first real deploy, per
  `docs/decisions/0007-manual-deploy-trigger.md`), this is worth revisiting as
  its **own dedicated, focused piece of work** — not bundled into a phase doing
  several other things — specifically starting by confirming whether Node's ESM
  module loader is safe on this host's thread ceiling (the one open question
  nothing short of host access can answer), before touching any application code.
- If/when it is attempted: do the `PrismaClient` construction change
  (`src/lib/db/index.ts`, point 4 above) and the import-path mechanical update
  together as the bulk of the work; the ESM flip (point 2) is the part to test
  most cautiously, ideally on a throwaway branch deployed to the staging target
  mentioned in `docs/deploy/host-facts.md` §5, specifically to watch for thread-
  related crashes before merging anything.
- No code changed as part of this ADR — it's a research-only spike, as the
  master plan's wording ("record the result as an ADR either way") anticipates
  a negative/deferred result being a valid outcome, not just an adoption writeup.
