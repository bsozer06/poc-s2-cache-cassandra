#!/usr/bin/env bash
# wait-for-it.sh -- A script to wait for a service to become available
# Source: https://github.com/vishnubob/wait-for-it

set -e

HOST="$1"
PORT="$2"
shift 2

TIMEOUT=60
STRICT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout=*)
      TIMEOUT="${1#*=}"
      ;;
    --strict)
      STRICT=1
      ;;
    --)
      shift
      break
      ;;
    *)
      break
      ;;
  esac
  shift
done

CMD=("$@")

for ((i=0;i<TIMEOUT;i++)); do
  if nc -z "$HOST" "$PORT"; then
    if [[ $STRICT -eq 1 ]]; then
      sleep 2
    fi
    exec "${CMD[@]}"
    exit 0
  fi
  sleep 1
done

echo "Timeout after ${TIMEOUT}s waiting for $HOST:$PORT" >&2
exit 1
