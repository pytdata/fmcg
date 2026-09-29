#!/bin/sh
# Railway's private network is IPv6 in some environments and IPv4 in others.
# Bind dual-stack (::) first; fall back to IPv4 if the container has no IPv6.
ARGS="--algorithm mld --port ${PORT:-5000} --max-table-size ${OSRM_MAX_TABLE_SIZE:-200} /data/map.osrm"
osrm-routed --ip :: $ARGS && exit 0
echo "[osrm] binding :: failed, falling back to 0.0.0.0" >&2
exec osrm-routed --ip 0.0.0.0 $ARGS
