## Role
You are a Node.js developer maintaining `/opt/share/prj/docker_build/docker-sshserver-nodebunpy/scripts/install_module.js`. You modify the `devsetup` proc to support two modes: creating a new component from scratch, or setting up an existing component repo from Gitea.

## Task
Update the `devsetup` case in `install_module.js` to support `--comp=<component_name>` flag. The proc now has two missions controlled by whether the component repo exists in Gitea.

## Context
The project is a Docker-based development environment. Key paths:
- `/opt/share/prj/<project>/` — real project skeleton (full working copy of files, NOT symlinks)
- `/opt/share/framework/` — shared framework (oricommjs_v2), files symlinked into prj/<project>/
- `/opt/share/atomic/` — shared atomic modules (atom, molecule, organism, template, page), symlinked into prj/<project>/atomic/
- `/opt/share/components/<comp>/` — component repos cloned from Gitea for developers
- Symlink: `prj/<project>/components/<comp>` → `../../components/<comp>`

Framework repo URL pattern: `vsrnd.synology.me:3000/2rd_system/<name>.git`
Atomic repo URL pattern: `vsrnd.synology.me:3000/2rd_system_<type>.git`
Component repo URL pattern: `vsrnd.synology.me:3000/components/<comp>.git`

The script is compiled to `/usr/local/bin/helper` inside the Docker container using Bun. Bun's shell mode ($``) does NOT expand globs — `rm -rf /path/*` fails when directory is empty. Always use `rm -rf ${dir}` then `mkdir -p ${dir}` instead.

## Command usage
```
helper --proc=devsetup --project=myapp --comp=newcomp --engine=webbunjs --credentials=user:pass
```

## Steps

### Step 1: Parse new flag
Add `--comp=<component_name>` as an optional flag. If provided, the proc enters "component setup mode".

### Step 2: Check if component repo exists in Gitea
Try to clone `components/<comp>.git` into a temp dir with `--depth=1`. If clone succeeds → component EXISTS (existing repo mode). If clone fails (404/auth error) → component DOES NOT EXIST (create from scratch mode).

### Step 3A: NEW component — create from scratch
When the component does not exist:
1. Create skeleton at `/opt/share/components/<comp>/` with a minimal `package.json` (name = comp name, version 1.0.0, empty dependencies) and a `README.md`.
2. Create project skeleton at `/opt/share/prj/<project>/` (same as current devsetup logic — copy framework files, engine, atomic, utils, components dirs, merge package.json dependencies).
3. Create symlink: `prj/<project>/components/<comp>` → `../../components/<comp>`
4. The developer then edits files inside `/opt/share/components/<comp>/` and commits to their own repo later.

### Step 3B: EXISTING component — clone and link
When the component repo exists in Gitea:
1. Clone `components/<comp>.git` into `/opt/share/components/<comp>/`.
2. Create project skeleton at `/opt/share/prj/<project>/` (same as current devsetup logic).
3. Create symlink: `prj/<project>/components/<comp>` → `../../components/<comp>`
4. Scan the cloned component's `package.json` and merge its dependencies into the project's `package.json`.

### Step 4: Engine selection (same as before)
User picks one of: `webbunjs`, `webnodehonojs`, `deskelectronjs`. Only the selected engine is copied into `prj/<project>/engine/`. The other engines are NOT included.

### Step 5: Framework symlinks into prj
The following framework files become symlinks in `prj/<project>/` (not copies):
- `framework/app.js` → symlink to `prj/<project>/app.js` (the project owns app.js, framework provides the template)
- `framework/utils/` → symlink to `prj/<project>/utils/`
- `framework/engine/` → symlink to `prj/<project>/engine/`
- `framework/atomic/` → symlink to `prj/<project>/atomic/`

Wait — re-read the tree. Actually:
- `/opt/share/framework/oricommjs_v2/` is the FRAMEWORK source (copied once, not symlinked)
- `prj/<project>/` is the PROJECT — it receives COPIES of framework files initially (app.js, engine/, atomic/, utils/, components/, package.json, .coresetting.toml)
- `/opt/share/atomic/` modules are SEPARATE cloned repos (atom, molecule, organism, template, page) — symlinked into `prj/<project>/atomic/<type>/`
- `/opt/share/components/<comp>/` is the component repo — symlinked into `prj/<project>/components/<comp>/`

So symlinks are ONLY for: atomic modules and component repos. Framework files are COPIED into the project skeleton.

### Step 6: package.json merging
Always merge dependencies from:
- Framework root `package.json` (track framework version)
- `engine/compmgr/package.json`
- `engine/sqlmanager/package.json`
- Selected engine `package.json`
- All `atomic/atom/*/package.json`
- If existing component: `components/<comp>/package.json`

## Constraints
- Do NOT hardcode credentials. Read from `--credentials=user:pass` flag.
- Do NOT use glob `/*` in Bun shell — use `rm -rf ${dir}` + `mkdir -p ${dir}`.
- Symlinks must be relative (e.g., `../../components/newcomp`), not absolute.
- The `--comp` flag is optional. Without it, devsetup behaves as before (no component setup).
- Use `gitClone` helper function for all git operations (avoids Bun template string mangling `@` in URLs).
- Use `ln -sfn` for symlinks.

## Output Format
Return the complete updated `devsetup` case from `install_module.js`. Show only the modified `case "devsetup":` block and any helper functions that changed.

## Verification
- After editing, verify the `devsetup` case has: flag parsing for `--comp`, existence check via git clone, two branches (new component / existing component), symlink creation, package.json merging including component deps, and no glob `/*` patterns.
- Confirm `gitClone` is used for all clone operations.
