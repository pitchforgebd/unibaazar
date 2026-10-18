# 0004: SCP instead of rsync for the deploy artifact upload

## Context

The master plan's §3.1 suggests "SSH + rsync" to upload the build artifact.
The artifact is a single `release.tar.gz` file (not a directory tree), and
`rsync`'s main advantages (incremental transfer of only changed files,
resuming partial transfers across many files) don't apply to copying one
compressed file.

## Decision

Use `appleboy/scp-action` (a well-maintained GitHub Action wrapping `scp`)
to upload `release.tar.gz` to `$APP_PATH/incoming/`, then unpack it on the
host inside the SSH step. Functionally equivalent to the plan's intent
("upload artifact to server (SSH)") with less moving configuration.

## Consequences

- If a later phase needs true rsync semantics (e.g. uploading `public/uploads`
  deltas directly instead of through the shared-directory symlink, or very
  large artifacts where partial-transfer resume matters), swap this one step
  for `appleboy/rsync-deploy-action` — nothing else in the pipeline depends
  on the transfer mechanism.
