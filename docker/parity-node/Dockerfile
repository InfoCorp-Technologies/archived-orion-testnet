FROM parity/parity:v1.11.11

WORKDIR /sentinel

RUN apt-get update && apt-get install -yq --no-install-recommends \
        gettext \
        nano \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY docker/parity-node/docker-entrypoint /usr/local/bin/
COPY docker/parity-node/config*.toml ./config/
COPY sentinel.json ./

RUN chmod +x /usr/local/bin/docker-entrypoint

VOLUME ["/sentinel/base-path", "/sentinel/nodes"]

ENTRYPOINT ["docker-entrypoint"]