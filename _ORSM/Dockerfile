# Ghana-only adaptation of delivery-hub/ops/osrm. Graph built before startup.
ARG OSRM_VERSION=v6.0.0
FROM debian:bookworm-slim AS fetch
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN curl -fSL --retry 5 --retry-delay 5 -o /map.osm.pbf https://download.geofabrik.de/africa/ghana-latest.osm.pbf

FROM ghcr.io/project-osrm/osrm-backend:${OSRM_VERSION} AS build
WORKDIR /data
COPY --from=fetch /map.osm.pbf /data/map.osm.pbf
RUN osrm-extract -p /opt/car.lua map.osm.pbf && osrm-partition map.osrm && osrm-customize map.osrm && rm map.osm.pbf

FROM ghcr.io/project-osrm/osrm-backend:${OSRM_VERSION}
WORKDIR /data
COPY --from=build /data /data
COPY start.sh /start.sh
ENV PORT=5000
EXPOSE 5000
CMD ["sh", "/start.sh"]
