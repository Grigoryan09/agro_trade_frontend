# syntax=docker/dockerfile:1

# ── Build stage ────────────────────────────────────────────────────────────
# APP selects which of the two Angular targets (see angular.json) to build:
#   agro_trade_frontend  → storefront   (default)
#   agro_trade_admin     → admin host
FROM node:22-alpine AS build
ARG APP=agro_trade_frontend
WORKDIR /app

# Install deps against the lockfile first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the selected target (production configuration is the default).
COPY . .
RUN npx ng build ${APP} --configuration production

# The @angular/build:application builder emits browser assets under
# dist/<project>/browser. Collect them at a fixed path for the runtime stage.
RUN cp -r dist/${APP}/browser /app/site

# ── Runtime stage ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# nginx template is rendered by the official image's envsubst entrypoint,
# so backend upstreams are configurable at container start (see compose).
#
# By default that entrypoint substitutes EVERY environment variable, which would
# clobber any nginx runtime var whose name happens to collide with one ($host vs
# a HOST env var, etc.). Restrict substitution to exactly the five upstream vars
# so $http_upgrade / $host / $uri / $request_uri always survive rendering.
ENV NGINX_ENVSUBST_FILTER="^(API|CHAT|DOCUMENT|BANKING|SOCKET)_HOST$"

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/site /usr/share/nginx/html

EXPOSE 80
