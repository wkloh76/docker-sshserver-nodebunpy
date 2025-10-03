# syntax=docker/dockerfile:1

FROM alpine:3 AS rootfs-stage

# environment
ENV REL=noble
ENV ARCH=amd64
ENV TAG=oci-noble-24.04

# install packages
RUN \
  apk add --no-cache \
    bash \
    curl \
    git \
    jq \
    tzdata \
    xz

# grab base tarball
RUN \
  git clone --depth=1 https://git.launchpad.net/cloud-images/+oci/ubuntu-base -b ${TAG} /build && \
  cd /build/oci && \
  DIGEST=$(jq -r '.manifests[0].digest[7:]' < index.json) && \
  cd /build/oci/blobs/sha256 && \
  if jq -e '.layers // empty' < "${DIGEST}" >/dev/null 2>&1; then \
    TARBALL=$(jq -r '.layers[0].digest[7:]' < ${DIGEST}); \
  else \
    MULTIDIGEST=$(jq -r ".manifests[] | select(.platform.architecture == \"${ARCH}\") | .digest[7:]" < ${DIGEST}) && \
    TARBALL=$(jq -r '.layers[0].digest[7:]' < ${MULTIDIGEST}); \
  fi && \
  mkdir /root-out && \
  tar xf \
    ${TARBALL} -C \
    /root-out && \
  rm -rf \
    /root-out/var/log/* \
    /root-out/home/ubuntu \
    /root-out/root/{.ssh,.bashrc,.profile} \
    /build

# set version for s6 overlay
ARG S6_OVERLAY_VERSION="3.2.0.2"
ARG S6_OVERLAY_ARCH="x86_64"

# add s6 overlay
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp
RUN tar -C /root-out -Jxpf /tmp/s6-overlay-noarch.tar.xz
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_OVERLAY_ARCH}.tar.xz /tmp
RUN tar -C /root-out -Jxpf /tmp/s6-overlay-${S6_OVERLAY_ARCH}.tar.xz

# add s6 optional symlinks
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-symlinks-noarch.tar.xz /tmp
RUN tar -C /root-out -Jxpf /tmp/s6-overlay-symlinks-noarch.tar.xz && unlink /root-out/usr/bin/with-contenv
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-symlinks-arch.tar.xz /tmp
RUN tar -C /root-out -Jxpf /tmp/s6-overlay-symlinks-arch.tar.xz

# Runtime stage
FROM scratch
COPY --from=rootfs-stage /root-out/ /
ARG BUILD_DATE
ARG VERSION
ARG MODS_VERSION="v3"
ARG PKG_INST_VERSION="v1"
ARG LSIOWN_VERSION="v1"
ARG WITHCONTENV_VERSION="v1"
LABEL build_version="Linuxserver.io version:- ${VERSION} Build-date:- ${BUILD_DATE}"
LABEL maintainer="TheLamer"

ADD --chmod=755 "https://raw.githubusercontent.com/linuxserver/docker-mods/mod-scripts/docker-mods.${MODS_VERSION}" "/docker-mods"
ADD --chmod=755 "https://raw.githubusercontent.com/linuxserver/docker-mods/mod-scripts/package-install.${PKG_INST_VERSION}" "/etc/s6-overlay/s6-rc.d/init-mods-package-install/run"
ADD --chmod=755 "https://raw.githubusercontent.com/linuxserver/docker-mods/mod-scripts/lsiown.${LSIOWN_VERSION}" "/usr/bin/lsiown"
ADD --chmod=755 "https://raw.githubusercontent.com/linuxserver/docker-mods/mod-scripts/with-contenv.${WITHCONTENV_VERSION}" "/usr/bin/with-contenv"

# set environment variables
ARG DEBIAN_FRONTEND="noninteractive"
ENV HOME="/root" \
  LANGUAGE="en_US.UTF-8" \
  LANG="en_US.UTF-8" \
  TERM="xterm" \
  S6_CMD_WAIT_FOR_SERVICES_MAXTIME="0" \
  S6_VERBOSITY=1 \
  S6_STAGE2_HOOK=/docker-mods \
  VIRTUAL_ENV=/lsiopy \
  PATH="/lsiopy/bin:$PATH"

# copy sources
COPY sources.list /etc/apt/

RUN \
  echo "**** Ripped from Ubuntu Docker Logic ****" && \
  rm -f /etc/apt/sources.list.d/ubuntu.sources && \
  set -xe && \
  echo '#!/bin/sh' \
    > /usr/sbin/policy-rc.d && \
  echo 'exit 101' \
    >> /usr/sbin/policy-rc.d && \
  chmod +x \
    /usr/sbin/policy-rc.d && \
  dpkg-divert --local --rename --add /sbin/initctl && \
  cp -a \
    /usr/sbin/policy-rc.d \
    /sbin/initctl && \
  sed -i \
    's/^exit.*/exit 0/' \
    /sbin/initctl && \
  echo 'force-unsafe-io' \
    > /etc/dpkg/dpkg.cfg.d/docker-apt-speedup && \
  echo 'DPkg::Post-Invoke { "rm -f /var/cache/apt/archives/*.deb /var/cache/apt/archives/partial/*.deb /var/cache/apt/*.bin || true"; };' \
    > /etc/apt/apt.conf.d/docker-clean && \
  echo 'APT::Update::Post-Invoke { "rm -f /var/cache/apt/archives/*.deb /var/cache/apt/archives/partial/*.deb /var/cache/apt/*.bin || true"; };' \
    >> /etc/apt/apt.conf.d/docker-clean && \
  echo 'Dir::Cache::pkgcache ""; Dir::Cache::srcpkgcache "";' \
    >> /etc/apt/apt.conf.d/docker-clean && \
  echo 'Acquire::Languages "none";' \
    > /etc/apt/apt.conf.d/docker-no-languages && \
  echo 'Acquire::GzipIndexes "true"; Acquire::CompressionTypes::Order:: "gz";' \
    > /etc/apt/apt.conf.d/docker-gzip-indexes && \
  echo 'Apt::AutoRemove::SuggestsImportant "false";' \
    > /etc/apt/apt.conf.d/docker-autoremove-suggests && \
  mkdir -p /run/systemd && \
  echo 'docker' \
    > /run/systemd/container && \
  echo "**** install apt-utils and locales ****" && \
  apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y \
    apt-utils \
    locales && \
  echo "**** install packages ****" && \
  apt-get install -y \
    catatonit \
    socat \
    sshpass \
    cron \
    curl \
    gnupg \
    jq \
    netcat-openbsd \
    systemd-standalone-sysusers \
    tzdata \
    sudo \
    ruby-dev \
    build-essential \
    git \
    python3 \
    python3-pip \
    python3-venv \
    openssh-server \
    lsof \
    iproute2 && \
  echo "**** generate locale ****" && \
  locale-gen en_US.UTF-8 && \
  echo "**** create sshadmin user and make our folders ****" && \
  useradd -u 911 -U -d /config -s /bin/false sshadmin && \
  usermod -G users sshadmin && \
  mkdir -p \
    /app \
    /config \
    /defaults \
    /lsiopy && \
  echo "**** cleanup ****" && \
  userdel ubuntu && \
  apt-get autoremove && \
  apt-get clean && \
  rm -rf \
    /tmp/* \
    /var/lib/apt/lists/* \
    /var/tmp/* \
    /var/log/*

# Get nodejs version from argument
ARG NODE_VERSION
RUN echo "Nodejs version is $NODE_VERSION"
RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" \
  && case "${dpkgArch##*-}" in \
    amd64) ARCH='x64';; \
    ppc64el) ARCH='ppc64le';; \
    s390x) ARCH='s390x';; \
    arm64) ARCH='arm64';; \
    armhf) ARCH='armv7l';; \
    i386) ARCH='x86';; \
    *) echo "unsupported architecture"; exit 1 ;; \
  esac \
  # use pre-existing gpg directory, see https://github.com/nodejs/docker-node/pull/1895#issuecomment-1550389150
  && export GNUPGHOME="$(mktemp -d)" \
  # gpg keys listed at https://github.com/nodejs/node#release-keys
  && set -ex \
  && for key in \
    5BE8A3F6C8A5C01D106C0AD820B1A390B168D356 \
    DD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7 \
    CC68F5A3106FF448322E48ED27F5E38D5B0A215F \
    8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
    890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4 \
    C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C \
    108F52B48DB57BB0CC439B2997B01419BD92F80A \
    A363A499291CBBC940DD62E41F10027AF002F8B0 \
  ; do \
      gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" || \
      gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" ; \
  done \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
  && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
  && gpgconf --kill all \
  && rm -rf "$GNUPGHOME" \
  && grep " node-v$NODE_VERSION-linux-$ARCH.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
  && tar -xJf "node-v$NODE_VERSION-linux-$ARCH.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
  && rm "node-v$NODE_VERSION-linux-$ARCH.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt \
  && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
  # smoke tests
  && node --version \
  && npm --version
  
# https://github.com/oven-sh/bun/releases
ARG BUN_VERSION
RUN apt-get update -qq \
  && apt-get install -qq --no-install-recommends \
    ca-certificates \
    curl \
    dirmngr \
    gpg \
    gpg-agent \
    unzip \
    python3 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && arch="$(dpkg --print-architecture)" \
  && case "${arch##*-}" in \
    amd64) build="x64-baseline";; \
    arm64) build="aarch64";; \
    *) echo "error: unsupported architecture: $arch"; exit 1 ;; \
  esac \
  && version="$BUN_VERSION" \
  && case "$version" in \
    latest | canary | bun-v*) tag="$version"; ;; \
    v*)                       tag="bun-$version"; ;; \
    *)                        tag="bun-v$version"; ;; \
  esac \
  && case "$tag" in \
    latest) release="latest/download"; ;; \
    *)      release="download/$tag"; ;; \
  esac \
  && curl "https://github.com/oven-sh/bun/releases/$release/bun-linux-$build.zip" \
    -fsSLO \
    --compressed \
    --retry 5 \
    || (echo "error: failed to download: $tag" && exit 1) \
  && for key in \
    "F3DCC08A8572C0749B3E18888EAB4D40A7B22B59" \
  ; do \
    gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys "$key" \
    || gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key" ; \
  done \
  && curl "https://github.com/oven-sh/bun/releases/$release/SHASUMS256.txt.asc" \
    -fsSLO \
    --compressed \
    --retry 5 \
  && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
    || (echo "error: failed to verify: $tag" && exit 1) \
  && grep " bun-linux-$build.zip\$" SHASUMS256.txt | sha256sum -c - \
    || (echo "error: failed to verify: $tag" && exit 1) \
  && unzip "bun-linux-$build.zip" \
  && mv "bun-linux-$build/bun" /usr/local/bin/bun \
  && rm -f "bun-linux-$build.zip" SHASUMS256.txt.asc SHASUMS256.txt \
  && chmod +x /usr/local/bin/bun \
  && which bun \
  && bun --version
  
COPY scripts/ /scripts

RUN \
  echo "**** setup openssh environment ****" && \
  sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/g' /etc/ssh/sshd_config && \
  usermod --shell /bin/bash sshadmin && \
  bun build /scripts/install_module.js --compile --outfile /usr/local/bin/helper && \
  chmod +x /usr/local/bin/helper && \
  rm -rf \
    /tmp/* \
    $HOME/.cache \
    /scripts

# add local files
COPY root/ /

ENTRYPOINT ["/init"]
