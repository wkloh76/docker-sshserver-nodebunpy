#!/bin/bash
# Build x64 image
set -a
source .env
set +a
docker build -f Dockerfile \
  --build-arg NODE_VERSION="${TAG}" \
  --build-arg BUN_VERSION="${ARG1}" \
  --build-arg KIMICODE_VERSION="${ARG2}" \
  -t "${IMG}:${TAG}-${ARG1}" .
