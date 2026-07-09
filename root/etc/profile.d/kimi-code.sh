#!/bin/sh
# Ensure kimi-code always installs to /usr/local/bin even during auto-upgrade
export KIMI_INSTALL_DIR="/usr/local"
export PATH="/usr/local/bin:$PATH"
