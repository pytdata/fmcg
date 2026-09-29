# Ghana-only OSRM on Railway

Adapted from delivery-hub/ops/osrm. Builds OSRM v6 MLD routing from the Ghana-only Geofabrik map using the car profile.

From the repository root:

    railway up _ORSM --path-as-root --service _ORSM --detach

PORT=5000. Backend OSRM_BASE_URL uses http://${{_ORSM.RAILWAY_PRIVATE_DOMAIN}}:5000. Keep the service private. Rebuild to refresh maps. The start script binds IPv6/IPv4 for Railway's private network. See ../DELIVERY_SETUP.md for configuration.
