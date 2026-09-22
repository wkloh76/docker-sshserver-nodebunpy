# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-09-22

### Summary

- Enhanced `helper --proc=devsetup` with component mode (`--comp`), supporting both new skeleton creation and existing repo cloning with atomic module resolution.
- `devsetup` now supports all 5 atomic types (`atom`, `molecule`, `organism`, `template`, `page`) with per-type Gitea repo cloning and symlink resolution.
- `genconf` now hard-codes encryption keys (`aes-256-cbc`, `secretKey`, `iv`) — no longer depends on `coresetting.toml` at container startup.
- `conf.toml` written to user's home directory (`/home/<user>/conf.toml`) instead of `/root/conf.toml`, so the SSH user can read it.

### Added

- `--comp=<name>` flag for `devsetup` — creates component skeleton from Gitea skeleton repo (`skelethon/temp-component`) or clones existing component repo from `components/<name>.git`
- New component: downloads full skeleton with design documents from `skelethon/temp-component` via `git archive`, replaces `package.json` placeholders (`name`, `version`, `atomic.atom`)
- Existing component: clones from Gitea, reads `package.json.atomic.atom`, auto-clones each atom module from `2rd_system_atom/<name>.git`, merges all dependencies
- Symlink: `prj/<project>/components/<comp>` → `/opt/share/components/<comp>` (absolute path)
- Auto-install: `devsetup` now automatically runs `helper --proc=install` after setup
- Credential validation: tests credentials before proceeding, prompts again on failure
- `process.exit(0)` after summary for clean exit
- Support for all atomic sub-types: `atom`, `molecule`, `organism`, `template`, `page`
- Per-type Gitea repo cloning: `atom` → `2rd_system_atom/`, `molecule` → `molecule/`, `organism` → `organism/`, `template` → `template/`, `page` → `page/`
- Atomic symlinks: project's `atomic/<type>/<name>` → `/opt/share/atomic/<type>/<name>` for all declared modules
- Dependency merging from all atomic types into project `package.json`
- `compPkg` moved to outer scope so it's accessible during symlink creation
- Hard-coded encryption config in `genconf.js`: `algorithm=aes-256-cbc`, `secretKey`, `iv` — container can encrypt password on first boot without any project existing yet
- `conf.toml` output path: defaults to `$HOME/conf.toml` (user home directory)
- `init-adduser/run`: passes `--output=/home/$NUSER/conf.toml` and sets correct ownership (`chown ${PUID}:${PGID}` + `chmod 600`)

### Changed

- `devsetup` flow restructured: credentials → project dir → framework → engine → component → setup → install
- Atomic modules copied from framework (not cloned as separate repos) for initial setup
- `package.json` placeholder replacement: `"name": ""` → component name, `"version": ""` → `unreleased`, `"atom": {"{key}":"{value}"}` → `{}`
- `coresetting.toml` output: no dot prefix (was `.coresetting.toml`)
- Engine selection: defaults to `webnodehonojs` without interactive prompt
- Framework selection: hardcoded to `oricommjs_v2`, no prompt
- Atomic symlink loop: only creates symlinks for modules declared in component's `package.json->atomic`
- `package` variable renamed to `pkg` (reserved word in strict mode)
- `genconf.js`: removed all `coresetting.toml` scanning/parsing logic, removed unused `fs` imports (`existsSync`, `readdirSync`)
- `init-adduser/run`: `genconf` runs with `HOME=/home/$NUSER` and explicit `--output` path

### Fixed

- `compExists` scope error (ReferenceError)
- Broken relative symlink → absolute path
- Empty glob `rm -rf dir/*` in Bun shell → use `rm -rf` + `mkdir`
- `argv.credentials` not updated from interactive prompt
- Atomic repos cloning from non-existent URLs → copy from framework
- `rules` directory not created before writing `rule.json` (ENOENT)
- `compPkg` not defined in atomic symlink loop (ReferenceError)
- `package` reserved word causing strict mode compilation error
- `devsetup` file lost during build cycle — full rewrite with all features restored
- `conf.toml` permission denied: was written to `/root/conf.toml` (root-owned), SSH user could not read it
- `conf.toml` not found on restart: `genconf` was deleted after first run, no fallback

## [1.0.1] - 2025-10-03

### Summary

- Design docker images with rootless for code develepment environment with `NodeJS` , `BunJS` and `Python3` language in ssh server.

### Added

- ~~Upgrade bun.js version to 1.2.23 and nodejs version 24.9.0. Completed on 2025-10-03~~
- Create default folders `/opt/share /{nodepath,data,build}` for development purpose. Completed on 2025-10-10
- ~~Upgrade bun.js version to 1.3.1 and nodejs version 24.11.0. Completed on 2025-11-05~~
- Upgrade bun.js version to 1.3.14 and nodejs version 24.18.0. Completed on 2026-07-03
- Implement kimi-code cli 0.22.1 to the environment. Completed on 2026-07-03
- Add `lsiown` script instead downloand from linuxserver.io due to github not found issue. Completed on 2026-07-09

### Changed

### Deprecated

### Removed

### Fixed

### Security

[1.0.1]: https://github.com/wkloh76/docker-sshserver-nodebunpy/releases/tag/1.0.1

## [1.0.0] - 2025-04-11

### Summary

- Design docker images with rootless for code develepment environment with `NodeJS` , `BunJS` and `Python3` language in ssh server.

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

[1.0.0]: https://github.com/wkloh76/docker-sshserver-nodebunpy/releases/tag/1.0.0
