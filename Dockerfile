# Doma: build the static app, then serve it with a small nginx that runs as an ordinary user.
#
#   docker build -t doma .
#   docker run -d -p 8080:8080 -e HA_URL=http://homeassistant.local:8123 doma
#
# HA_URL is read when the container starts (docker/40-doma-config.sh), so one image works with any Home Assistant.

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The same checks as on a laptop: types, then the start-up size budget.
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 docker/40-doma-config.sh /docker-entrypoint.d/40-doma-config.sh
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
EXPOSE 8080
