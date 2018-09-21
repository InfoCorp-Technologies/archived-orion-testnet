FROM node:8-alpine

WORKDIR /app

RUN apk add --update --no-cache \
    build-base \
    gettext \
    python \
    git

COPY services/sentinel-exchange/package*.json ./

RUN npm install

COPY services/sentinel-exchange ./
COPY docker/exchange-service/docker-entrypoint /usr/local/bin/

RUN chmod +x /usr/local/bin/docker-entrypoint

ENTRYPOINT ["docker-entrypoint"]