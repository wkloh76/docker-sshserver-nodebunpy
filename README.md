# Docker Deploy NodeBunPy

![Static Badge](https://img.shields.io/badge/License-Mulan_PSL_v2-_)
![Static Badge](https://img.shields.io/badge/NodeJS-V24_.9_.0-_)
![Static Badge](https://img.shields.io/badge/BunJS-V1_.2_.23-_)
![Static Badge](https://img.shields.io/badge/ElectronJS-V38_.2_.0-_)
![Static Badge](https://img.shields.io/badge/Python3-Latest-__?style=flat)
![Static Badge](https://img.shields.io/badge/OS-Ubuntu_24-_?style=flat)

## Objectvie

- Design docker images for code develepment with `NodeJS` , `BunJS` and `Python3` language in ssh server. The advantanges is always make your host machine environment clean.

- The docker-compose files combine both build and up containers feature in one files.

## Environment setup

### Docker deamon setup

- Create daemon file `/etc/docker/daemon.json` and content show as below
  ```
  {"insecure-registries":["xxx.xxx.xxx.xxx:port"]}
  ```
- Stop and start docker service from systemctl.

  ```
  sudo systemctl stop docker.socket && sudo systemctl stop docker.service

  sudo systemctl start docker.socket && sudo systemctl start docker.service
  ```

### Git

- git config user.name "My Name"

- git config user.email "myemail@example.com"

### figlet

- FIGlet is a utility for creating large characters out of ordinary screen characters. It's often used in terminal sessions to create eye-catching text, banners, or headers.

  ```
  Figlet -w 60  'ALPINE BUNJS' >> ./BANNER
  ```

## Take Noted

- Docker build image depend on `.env` file. So, copy and paste `.env.example` and rename it to `.env`. Ater that run command `docker compose build` in the terminal with same project.
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
- Run command `docker compose up -d` will establish ssh server container.Then you can use visual studio code which already active the remote ssh extension and establish connection with user `test@localhost` with port `9700`. The paswword is `test1234`

  ```
  ssh_nodebunpy_deploy:
    image: "${IMG}:${TAG}-${ARG1}"
    container_name: ssh_nodebunpy_deploy
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Kuala_Lumpur
      - SUDO_ACCESS=true #optional
      - PASSWORD_ACCESS=true #optional
      - USER_PASSWORD=test1234 #optional  and can change
      - USER_NAME=test #optional and can change
      - LOG_STDOUT= #optional
    # volumes:
    #   - home_data:/home ### Cannot apply in synology
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

- When the connection is established, vscode will set up the vscode server as a container on first access.
- Your source code folder can be mapped to the container volume "/opt/share" and the container will access it directly as if it were inside.

# Reference

- Change the password without prompt message box

  ```
  echo <user>:<password>> | sudo chpasswd
  ```

- [baseimage noble-cea744e8-ls30](https://github.com/linuxserver/docker-baseimage-ubuntu/releases/tag/noble-cea744e8-ls30)

- [How to Set a Custom SSH Warning Banner and MOTD in Linux](https://www.tecmint.com/ssh-warning-banner-linux/)
- [Crafting Striking Terminal Text with FIGlet](https://labex.io/tutorials/linux-crafting-striking-terminal-text-with-figlet-272383)

- [how to check if a variable is set in bash](https://stackoverflow.com/questions/3601515/how-to-check-if-a-variable-is-set-in-bash)
