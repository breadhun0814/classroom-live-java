#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
exec java -Dfile.encoding=UTF-8 --add-modules jdk.httpserver -jar ClassroomLive.jar "${1:-serve}"
