#!/bin/sh
# Runs when the container starts (nginx's /docker-entrypoint.d): writes where Home Assistant is into config.js,
# which the page reads before the app starts. Without HA_URL the app asks on its setup screen.
set -eu

config=/usr/share/nginx/html/config.js
url="${HA_URL:-}"

if [ -z "$url" ]; then
    echo "doma: HA_URL is not set; the app will ask for Home Assistant's address."
    printf 'window.DOMA_CONFIG = {};\n' > "$config"
    exit 0
fi

# Only an http(s) address, with no characters that could break out of the string below.
case "$url" in
    http://*|https://*) ;;
    *) echo "doma: HA_URL must start with http:// or https:// (got: $url)" >&2; exit 1 ;;
esac
if printf '%s' "$url" | grep -q '[^A-Za-z0-9.:/_~%@+-]'; then
    echo "doma: HA_URL has characters an address can't have (got: $url)" >&2
    exit 1
fi

printf 'window.DOMA_CONFIG = { haUrl: "%s" };\n' "${url%/}" > "$config"
echo "doma: Home Assistant is at ${url%/}"
