# Docker Deploy NodeBunPy

![Static Badge](https://img.shields.io/badge/License-Mulan_PSL_v2-_)
![Static Badge](https://img.shields.io/badge/NodeJS-V24.21.0-_)
![Static Badge](https://img.shields.io/badge/BunJS-V1.4.2-_)
![Static Badge](https://img.shields.io/badge/Python3-Latest-__?style=flat)
![Static Badge](https://img.shields.io/badge/OS-Ubuntu_24.04-_?style=flat)

## Objective

Design Docker images for code development with `NodeJS`, `BunJS`, and `Python3` on an SSH server. The main advantage is keeping your host machine environment clean.

## Architecture Map

```
┌───────────────────────────────────────────────────────────────────────┐
│                    Host Machine (x64)                                  │
│                                                                        │
│  /opt/share/                   ← Shared development tree               │
│  ├── prj/                     ← Project skeletons (working projects)   │
│  │   └── web_oqc/             ← Full project with engine, atomic, ...  │
│  ├── framework/               ← Shared framework                       │
│  │   └── oricommjs_v2/       ← Framework code                         │
│  ├── atomic/                  ← Shared atomic modules                  │
│  │   ├── atom/                                                │
│  │   ├── molecule/                                            │
│  │   ├── organism/                                            │
│  │   ├── template/                                            │
│  │   └── page/                                                │
│  └── components/              ← Shared components / project repos    │
│                                                                        │
│  docker-compose.yml                                                    │
│  ├── ssh_nodebunpy_deploy  ← SSH server + Kimi Code CLI               │
│  └── helper            ← Compiled from install_module.js               │
└────────────────────────────────────────────────────────────────────────┘
```

## Project Tree

```
docker-sshserver-nodebunpy/
├── Dockerfile              ← x64 build (amd64)
├── Dockerfile.aarch64      ← ARM64 build (arm64)
├── docker-compose.yml      ← Container orchestration
├── .env                    ← Version variables
│   ├── IMG=vsrnd.synology.me:3000/docker_images/noble-nodebunpy-sshserver
│   ├── TAG=24.21.0          ← Node.js version
│   ├── ARG1=1.4.2           ← Bun.js version
│   └── ARG2=2.0.2           ← Kimi Code CLI version
├── sources.list            ← apt sources (x64)
├── sources.list.arm        ← apt sources (arm64)
├── scripts/
│   ├── install_module.js   ← Helper script source
│   └── lsiown              ← Permission fixer
├── root/                   ← Container root files
└── README.md
```

## Quick Start

### 1. Build & Run

```bash
# Copy env
cp .env.example .env          # Edit versions if needed

# Build image
./build.sh                    # Uses .env versions automatically

# Start container
docker compose up -d ssh_nodebunpy_deploy

# Connect
ssh test@localhost -p 9700    # password: test1234
```

### 2. Build without docker-compose

```bash
# Simple build using .env versions
./build.sh

# Or manually
docker buildx build \
  --build-arg NODE_VERSION=$(grep TAG .env | cut -d= -f2) \
  --build-arg BUN_VERSION=$(grep ARG1 .env | cut -d= -f2) \
  --build-arg KIMICODE_VERSION=$(grep ARG2 .env | cut -d= -f2) \
  -t vsrnd.synology.me:3000/docker_images/noble-nodebunpy-sshserver:$(grep TAG .env | cut -d= -f2)-$(grep ARG1 .env | cut -d= -f2) \
  -f Dockerfile.aarch64 \
  --load .
```

### 3. Useful Commands

| Task | Command |
|------|---------|
| Build | `./build.sh` |
| Start | `docker compose up -d ssh_nodebunpy_deploy` |
| Stop | `docker compose down` |
| Logs | `docker compose logs -f ssh_nodebunpy_deploy` |
| SSH in | `ssh test@localhost -p 9700` |
| Helper help | `helper --help` |
| Encrypted password | `cat ~/conf.toml` (auto-generated on first boot) |

## Helper (`install_module.js`)

Compiled into `/usr/local/bin/helper` inside the container. Four operation modes:

### `kill` — Free a port

```bash
helper --proc=kill --port=3000
```

### `install` — Re-install dependencies

Use when `package.json` has changed (new dependencies added):

```bash
helper --proc=install --dir=/opt/share/prj/myapp
```

> **Note:** `devsetup` already auto-runs `install` at the end. Only use `install` manually when you've edited `package.json` and need to refresh `node_modules`.

### `devsetup` — Interactive development tree setup (Q&A)

Sets up the full development tree with framework, atomic modules, and optional components:

```bash
# Basic setup (interactive Q&A)
helper --proc=devsetup --project=myapp --credentials=user:pass

# With component mode — new skeleton
helper --proc=devsetup --project=myapp --comp=newcomp --credentials=user:pass

# With component mode — existing repo
helper --proc=devsetup --project=myapp --comp=oqc --engine=webbunjs --credentials=user:pass
```

**Flow:**
1. **Credentials** — `user:pass` or `--credentials` flag (validated before proceeding)
2. **Project name** — from `--project` flag
3. **Framework** — hardcoded to `oricommjs_v2` (no prompt)
4. **Engine type** — defaults to `webnodehonojs` (no prompt, override with `--engine`)
5. **Component** (optional) — `--comp=<name>` flag

**Component modes (`--comp`):**

| Mode | Behavior |
|------|----------|
| **New skeleton** | Downloads latest from `skelethon/temp-component` repo via `git archive`, replaces `package.json` placeholders (`name`, `version="unreleased"`, all `atomic.*={}`) |
| **Existing repo** | Clones from `components/<name>.git`, reads `package.json.atomic` (atom, molecule, organism, template, page), auto-clones each module from its respective Gitea repo, merges all dependencies |

**Atomic types and Gitea repos:**

| Type | Gitea Repo Path |
|------|----------------|
| `atom` | `2rd_system_atom/<name>.git` |
| `molecule` | `molecule/<name>.git` |
| `organism` | `organism/<name>.git` |
| `template` | `template/<name>.git` |
| `page` | `page/<name>.git` |

**What it creates:**

```
/opt/share/
├── prj/myapp/                   ← Project skeleton (full working project)
│   ├── app.js                   ← Entry point
│   ├── engine/                  ← compmgr, workflow, sqlmanager, <selected-engine>
│   ├── atomic/                  ← atom, molecule, organism, template, page
│   │   ├── atom/                ← symlinks → /opt/share/atomic/atom/<name>/
│   │   ├── molecule/            ← symlinks → /opt/share/atomic/molecule/<name>/
│   │   └── ...                  ← (only for declared modules)
│   ├── utils/                   ← Shared utilities
│   ├── components/              ← Component symlinks
│   │   └── oqc → /opt/share/components/oqc/
│   ├── package.json             ← Merged dependencies
│   └── coresetting.toml         ← Project config
├── framework/oricommjs_v2/      ← Shared framework
├── atomic/{atom,molecule,...}/  ← Shared atomic modules
└── components/oqc/              ← Component repo (cloned or skeleton)
```

**Auto-installs dependencies after setup:**

```bash
# No manual install needed — devsetup runs helper --proc=install automatically
```

## Development Workflow

### Basic project setup
```
1. helper --proc=devsetup --project=myapp --credentials=user:pass
   ↓ (auto-installs dependencies)
2. Developer works in /opt/share/prj/myapp/
   ↓
3. helper --proc=install --dir=/opt/share/prj/myapp
   (re-run when package.json changes)
```

### With component setup
```
1. helper --proc=devsetup --project=myapp --comp=oqc --credentials=user:pass
   ↓ (auto-installs dependencies)
2. Developer works in /opt/share/prj/myapp/ and /opt/share/components/oqc/
   ↓
3. helper --proc=install --dir=/opt/share/prj/myapp
   (re-run when package.json changes)
```

## Container Structure

```
Container (Ubuntu 24.04 + s6-overlay):
├── Node.js v24.21.0
├── Bun.js v1.4.2
├── Kimi Code CLI v2.0.2
├── Python3 + pip + venv
├── OpenSSH Server (port 2222)
├── helper              ← Compiled install_module.js
├── /opt/share          ← Working directory (mapped from host)
├── /config             ← SSH config
├── /app                ← Application directory
└── /nodepath           ← Shared node_modules
```

## Engine Types

| Engine | Port | Use Case |
|--------|------|----------|
| webbunjs | 3000 | Web app with Bun |
| webnodehonojs | 3001 | Web app with Node.js + Hono |
| appservicejs | 3002 | Backend API service |
| deskelectronjs | — | Desktop Electron app |

## Mandatory Framework Modules

Always included with every project:
- **compmgr** — Component manager
- **workflow** — Workflow engine
- **sqlmanager** — Database manager (mariadb, bcrypt, etc.)

## Version Variables (`.env`)

| Variable | Meaning | Default |
|----------|---------|---------|
| `TAG` | Node.js version | 24.21.0 |
| `ARG1` | Bun.js version | 1.4.2 |
| `ARG2` | Kimi Code CLI version | 2.0.2 |
| `IMG` | Image registry | vsrnd.synology.me:3000/docker_images/noble-nodebunpy-sshserver |

## Notes

- **Docker daemon**: Configure insecure registry in `/etc/docker/daemon.json`
- **Volumes**: `/opt/share` maps host source code into container
- **Cross-platform**: `Dockerfile` for x64, `Dockerfile.aarch64` for ARM64
- **First access**: VS Code sets up VS Code Server automatically via Remote SSH

## Reference

- [baseimage noble](https://github.com/linuxserver/docker-baseimage-ubuntu/releases)
- [s6-overlay](https://github.com/just-containers/s6-overlay)
- [Node.js](https://nodejs.org/)
- [Bun.js](https://bun.sh/)
- [Kimi Code CLI](https://code.kimi.com/)
