FROM node:8-alpine

WORKDIR /app

RUN apk add --update --no-cache \
        build-base \
        gettext \
        python \
        git

COPY services/data-query/package*.json ./

RUN npm install

COPY services/data-query ./
COPY docker/data-query-service/docker-entrypoint /usr/local/bin/

RUN chmod +x /usr/local/bin/docker-entrypoint

ENTRYPOINT ["docker-entrypoint"]