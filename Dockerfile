FROM parity/parity:v1.11.11

ARG USER_ID
ARG GROUP_ID

# Add user with specified (or default) user/group ids
ENV USER_ID=${USER_ID:-1000}
ENV GROUP_ID=${GROUP_ID:-1000}

# Add our user and group first to make sure their IDs get assigned consistently,
# regardless of whatever dependencies get added
RUN groupadd -g ${GROUP_ID} sentinel \
    && useradd -u ${USER_ID} -g sentinel -s /bin/bash -m -d /sentinel sentinel

WORKDIR /sentinel

RUN apt-get update && apt-get install -yq --no-install-recommends gettext \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY config ./config
COPY sentinel.json ./
COPY docker-entrypoint /usr/local/bin/

RUN chmod +x /usr/local/bin/docker-entrypoint

VOLUME ["/sentinel/base-path"]

ENTRYPOINT ["docker-entrypoint"]