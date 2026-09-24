# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-09-22

### Fixed

- `helper --proc=install` symlink creation fails with "Permission denied" when project directory is owned by a different user — now attempts `chown` and retries `ln` on failure. Completed on 2026-09-24
- `helper --proc=recheck` relinks `node_modules` when `/nodepath/<user>/<project>/node_modules` exists but symlink in project dir is broken. Completed on 2026-09-24
- `helper --proc=recheck` rebuilds `node_modules` when `/nodepath/<user>/<project>/node_modules` is missing instead of skipping. Completed on 2026-09-24

### Summary

- Enhanced `helper --proc=devsetup` with component mode (`--comp`), supporting both new skeleton creation and existing repo cloning with atomic module resolution. Completed on 2026-09-22
- `devsetup` now supports all 5 atomic types (`atom`, `molecule`, `organism`, `template`, `page`) with per-type Gitea repo cloning and symlink resolution. Completed on 2026-09-22
- `genconf` now hard-codes encryption keys (`aes-256-cbc`, `secretKey`, `iv`) — no longer depends on `coresetting.toml` at container startup. Completed on 2026-09-22
- `conf.toml` written to user's home directory (`/home/<user>/conf.toml`) instead of `/root/conf.toml`, so the SSH user can read it. Completed on 2026-09-22
- Framework and component cloning now lists all tags/branches for user to select, then clones full repo and checks out selected tag. Completed on 2026-09-22
- All git clone operations use `cp -a` to preserve `.git` hidden directory. Completed on 2026-09-22

### Added

- `--comp=<name>` flag for `devsetup` — creates component skeleton from Gitea skeleton repo (`skelethon/temp-component`) or clones existing component repo from `components/<name>.git`. Completed on 2026-09-22
- New component: downloads full skeleton with design documents from `skelethon/temp-component` via `git archive`, replaces `package.json` placeholders (`name`, `version`, `atomic.atom`). Completed on 2026-09-22
- Existing component: clones from Gitea, reads `package.json.atomic` (atom, molecule, organism, template, page), auto-clones each module from its respective Gitea repo, merges all dependencies. Completed on 2026-09-22
- Symlink: `prj/<project>/components/<comp>` → `/opt/share/components/<comp>` (absolute path). Completed on 2026-09-22
- Auto-install: `devsetup` now automatically runs `helper --proc=install` after setup. Completed on 2026-09-22
- Credential validation: tests credentials before proceeding, prompts again on failure. Completed on 2026-09-22
- `process.exit(0)` after summary for clean exit. Completed on 2026-09-22
- Support for all atomic sub-types: `atom`, `molecule`, `organism`, `template`, `page`. Completed on 2026-09-22
- Per-type Gitea repo cloning: `atom` → `2rd_system_atom/`, `molecule` → `molecule/`, `organism` → `organism/`, `template` → `template/`, `page` → `page/`. Completed on 2026-09-22
- Atomic symlinks: project's `atomic/<type>/<name>` → `/opt/share/atomic/<type>/<name>` for all declared modules. Completed on 2026-09-22
- Dependency merging from all atomic types into project `package.json`. Completed on 2026-09-22
- `compPkg` moved to outer scope so it's accessible during symlink creation. Completed on 2026-09-22
- Hard-coded encryption config in `genconf.js`: `algorithm=aes-256-cbc`, `secretKey`, `iv` — container can encrypt password on first boot without any project existing yet. Completed on 2026-09-22
- `conf.toml` output path: defaults to `$HOME/conf.toml` (user home directory). Completed on 2026-09-22
- `init-adduser/run`: passes `--output=/home/$NUSER/conf.toml` and sets correct ownership (`chown ${PUID}:${PGID}` + `chmod 600`). Completed on 2026-09-22
- Framework tag selection: lists all tags via `git ls-remote --tags`, user selects tag or HEAD. Completed on 2026-09-22
- Component tag selection: same tag listing and selection for `--comp` repos. Completed on 2026-09-22
- Atomic module tag checkout: clones full repo then checks out specified tag version. Completed on 2026-09-22

### Changed

- `devsetup` flow restructured: credentials → project dir → framework → engine → component → setup → install. Completed on 2026-09-22
- Atomic modules copied from framework (not cloned as separate repos) for initial setup. Completed on 2026-09-22
- `package.json` placeholder replacement: `"name": ""` → component name, `"version": ""` → `unreleased`, `"atom": {"{key}":"{value}"}` → `{}`. Completed on 2026-09-22
- `coresetting.toml` output: no dot prefix (was `.coresetting.toml`). Completed on 2026-09-22
- Engine selection: defaults to `webnodehonojs` without interactive prompt. Completed on 2026-09-22
- Framework selection: hardcoded to `oricommjs_v2`, no prompt. Completed on 2026-09-22
- Atomic symlink loop: only creates symlinks for modules declared in component's `package.json->atomic`. Completed on 2026-09-22
- `package` variable renamed to `pkg` (reserved word in strict mode). Completed on 2026-09-22
- `genconf.js`: removed all `coresetting.toml` scanning/parsing logic, removed unused `fs` imports (`existsSync`, `readdirSync`). Completed on 2026-09-22
- `init-adduser/run`: `genconf` runs with `HOME=/home/$NUSER` and explicit `--output` path. Completed on 2026-09-22
- Git clone: uses `cp -a` instead of `mv *` to preserve `.git` hidden directory. Completed on 2026-09-22
- Git clone: full repo clone + `git checkout tags/<tag>` instead of `--depth=1 --branch`. Completed on 2026-09-22

### Fixed

- `compExists` scope error (ReferenceError). Completed on 2026-09-22
- Broken relative symlink → absolute path. Completed on 2026-09-22
- Empty glob `rm -rf dir/*` in Bun shell → use `rm -rf` + `mkdir`. Completed on 2026-09-22
- `argv.credentials` not updated from interactive prompt. Completed on 2026-09-22
- Atomic repos cloning from non-existent URLs → copy from framework. Completed on 2026-09-22
- `rules` directory not created before writing `rule.json` (ENOENT). Completed on 2026-09-22
- `compPkg` not defined in atomic symlink loop (ReferenceError). Completed on 2026-09-22
- `package` reserved word causing strict mode compilation error. Completed on 2026-09-22
- `devsetup` file lost during build cycle — full rewrite with all features restored. Completed on 2026-09-22
- `conf.toml` permission denied: was written to `/root/conf.toml` (root-owned), SSH user could not read it. Completed on 2026-09-22
- `conf.toml` not found on restart: `genconf` was deleted after first run, no fallback. Completed on 2026-09-22
- `try/catch` not catching Bun shell errors → use `exitCode` check. Completed on 2026-09-22
- `.git` directory missing after clone → `mv *` skips hidden files, use `cp -a`. Completed on 2026-09-22
- `ShellPromise.text` not returning string → use `typeof` check + `String()` conversion. Completed on 2026-09-22
- `helper --help` showing `--proc undefined!` → check for `--help`/`-h` flags. Completed on 2026-09-22
- `itemTmp` not defined in atomic clone loop — moved declaration before `if/else` branches. Completed on 2026-09-23
- `coresetting.toml` dot prefix removed (was `.coresetting.toml`, now `coresetting.toml`). Completed on 2026-09-23
- `--framework` default: hardcoded to `oricommjs_v2`, no tag selection prompt — clones HEAD directly. Completed on 2026-09-24
- New `--proc=recheck` mode: scans existing project for broken symlinks and reconnects them, auto-installs if `node_modules` missing. Completed on 2026-09-24

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
