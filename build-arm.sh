#!/bin/bash
# Build ARM64 image
set -a
source .env
set +a
docker buildx build --platform linux/arm64 -f Dockerfile.aarch64 \
  --build-arg NODE_VERSION="${TAG}" \
  --build-arg BUN_VERSION="${ARG1}" \
  --build-arg KIMICODE_VERSION="${ARG2}" \
  -t "${IMG}:${TAG}-${ARG1}-arm64" .
