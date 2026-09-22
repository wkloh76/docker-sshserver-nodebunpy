#!/bin/bash
# Monitor container status, logs, and health
set -a
source .env
set +a

CONTAINER="ssh_nodebunpy_deploy"

case "${1:-status}" in
  status)
    echo "=== Container Status ==="
    docker ps --filter "name=${CONTAINER}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;
  logs)
    echo "=== Logs (last 50 lines, press Ctrl+C to exit) ==="
    docker logs -f --tail 50 "${CONTAINER}"
    ;;
  health)
    echo "=== Container Health ==="
    STATUS=$(docker inspect -f '{{.State.Status}}' "${CONTAINER}" 2>/dev/null)
    if [ -z "$STATUS" ]; then
      echo "Container '${CONTAINER}' not found"
      exit 1
    fi
    echo "Status: ${STATUS}"
    echo ""
    echo "=== Resource Usage ==="
    docker stats --no-stream "${CONTAINER}" --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    ;;
  restart)
    echo "Restarting ${CONTAINER}..."
    docker restart "${CONTAINER}"
    ;;
  *)
    echo "Usage: $0 {status|logs|health|restart}"
    echo ""
    echo "  status   - Show container status (default)"
    echo "  logs     - Follow container logs"
    echo "  health   - Show health and resource usage"
    echo "  restart  - Restart the container"
    ;;
esac
