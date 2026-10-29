#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
java Build.java "$@"
