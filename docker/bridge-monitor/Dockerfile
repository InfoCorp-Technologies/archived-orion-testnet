FROM node:8-alpine

RUN apk add --update --no-cache --virtual .gyp \
        python \
        make \
        g++ \
        git \
    && git clone https://github.com/poanetwork/bridge-monitor.git \
    && cd bridge-monitor \
    && npm install \
    && npm cache clean --force \
    && apk del .gyp

COPY docker/bridge-monitor/docker-entrypoint /usr/local/bin/

RUN echo '*/4 * * * * cd /bridge-monitor; node checkWorker.js >>cronWorker.out 2>>cronWorker.err' > /etc/crontabs/root \
    && echo '*/5 * * * * cd /bridge-monitor; node checkWorker2.js >>cronWorker2.out 2>>cronWorker2.err' >> /etc/crontabs/root \
    && chmod +x /usr/local/bin/docker-entrypoint /etc/crontabs/root \
    && /usr/bin/crontab /etc/crontabs/root

WORKDIR /bridge-monitor

ENTRYPOINT ["docker-entrypoint"]