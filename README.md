# Docker Deploy NodeBunPy

![Static Badge](https://img.shields.io/badge/License-Mulan_PSL_v2-_)
![Static Badge](https://img.shields.io/badge/NodeJS-V24_.18_.0-_)
![Static Badge](https://img.shields.io/badge/BunJS-V1_.3_.14-_)
![Static Badge](https://img.shields.io/badge/ElectronJS-V42_.4_.1-_)
![Static Badge](https://img.shields.io/badge/Python3-Latest-__?style=flat)
![Static Badge](https://img.shields.io/badge/OS-Ubunut_24.04-_?style=flat)

## Objective

Design Docker images for code development with `NodeJS`, `BunJS`, and `Python3` on an SSH server. The main advantage is keeping your host machine environment clean.

The Docker Compose files combine both build and up container features in one file.

## Quick Start

1. Copy `.env.example` → `.env`
2. Run `docker compose build`
3. Run `docker compose up -d`
4. Connect via `ssh test@localhost -p 9700` (password: `test1234`)

## Kimi Code CLI

### What is Kimi Code CLI

Kimi Code CLI is an AI-powered developer assistant that runs inside your terminal. It understands your codebase, can edit files, run commands, manage Docker builds, and help with development tasks — all through natural language.

### How to use in this project

1. **Launch**: Open a terminal in the project root and run `kimi`
2. **Connect**: SSH into the container at `test@localhost:9700`
3. **Develop**: Use Kimi Code CLI to edit code, run scripts, manage dependencies — it works directly inside the container via the SSH connection

### Useful commands

| Task | Command |
|------|---------|
| Build image | `docker compose build` |
| Start container | `docker compose up -d` |
| Stop container | `docker compose down` |
| View logs | `docker compose logs -f ssh_nodebunpy_deploy` |
| SSH in | `ssh test@localhost -p 9700` |

### Manually add provider and model

Edit `~/.kimi-code/config.toml` to add providers and models:

**Add a provider** (e.g. OpenAI-compatible API):
```toml
[providers.my_provider]
type = "openai"
base_url = "https://api.example.com/v1"
api_key = "sk-your-key"
```

**Register a model** under that provider:
```toml
[models."my-model-name"]
provider = "my_provider"
model = "model-name-on-server"
max_context_size = 131072
```

**Set as default**:
```toml
default_model = "my-model-name"
```

Supported provider types: `openai`, `anthropic`, `google`, `azure`, and any LiteLLM-compatible endpoint.

## Environment Setup

### Docker daemon setup

- Create daemon file `/etc/docker/daemon.json` with the following content:
  ```
  {"insecure-registries":["xxx.xxx.xxx.xxx:port"]}
  ```
- Stop and start Docker service via systemctl:
  ```
  sudo systemctl stop docker.socket && sudo systemctl stop docker.service
  sudo systemctl start docker.socket && sudo systemctl start docker.service
  ```

### Git

```
git config user.name "My Name"
git config user.email "myemail@example.com"
```

### FIGlet

FIGlet is a utility for creating large characters out of ordinary screen characters. It's often used in terminal sessions to create eye-catching text, banners, or headers.

```
figlet -w 60  'ALPINE BUNJS' >> ./BANNER
```

## Notes

- Docker build depends on the `.env` file. Copy `.env.example` and rename it to `.env`, then run `docker compose build` in the project directory:
  ```
  sshnodebunpy-build:
    image: "${IMG}:${TAG}-${ARG1}"
    build:
      context: .
      dockerfile: ./Dockerfile
      args:
        NODE_VERSION: "${TAG}"
        BUN_VERSION: "${ARG1}"
  ```

- Run `docker compose up -d` to start the SSH server container. Then use Visual Studio Code with the Remote SSH extension to connect as `test@localhost` on port `9700`. The password is `test1234`:
  ```
  ssh_nodebunpy_deploy:
    image: "${IMG}:${TAG}-${ARG1}"
    container_name: ssh_nodebunpy_deploy
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Kuala_Lumpur
      - SUDO_ACCESS=true # optional
      - PASSWORD_ACCESS=true # optional
      - USER_PASSWORD=test1234 # optional and can change
      - USER_NAME=test # optional and can change
      - LOG_STDOUT= # optional
    # volumes:
    #   - home_data:/home ### Cannot apply in Synology
    #   - /test/share:/opt/share
    #   - /test/data:/data
    #   - /test/nodepath:/nodepath
    working_dir: /opt/share
    ports:
      - 9700:2222
      - 9720-9721:3000-3001
    shm_size: "2gb"
    restart: unless-stopped
    deploy:
      resources:
        limits:
          # cpus: "2.0"
          memory: 2000M
  ```

- On first access, VS Code will set up the VS Code Server as a container.
- Your source code folder can be mapped to the container volume `/opt/share`, and the container will access it directly as if it were inside.

## Reference

- Change password without prompt message box:
  ```
  echo <user>:<password> | sudo chpasswd
  ```

- [baseimage noble-cea744e8-ls30](https://github.com/linuxserver/docker-baseimage-ubuntu/releases/tag/noble-cea744e8-ls30)

- [How to Set a Custom SSH Warning Banner and MOTD in Linux](https://www.tecmint.com/ssh-warning-banner-linux/)
- [Crafting Striking Terminal Text with FIGlet](https://labex.io/tutorials/linux-crafting-striking-terminal-text-with-figlet-272383)
- [How to check if a variable is set in bash](https://stackoverflow.com/questions/3601515/how-to-check-if-a-variable-is-set-in-bash)
