FROM parity/parity:stable

#VOLUME ["/data" ]

ARG USER_ID
ARG GROUP_ID

# Add user with specified (or default) user/group ids
ENV USER_ID=${USER_ID:-1000}
ENV GROUP_ID=${GROUP_ID:-1000}

# Add our user and group first to make sure their IDs get assigned consistently,
# regardless of whatever dependencies get added
RUN groupadd -g ${GROUP_ID} sentinel \
&& useradd -u ${USER_ID} -g sentinel -s /bin/bash -m -d /data sentinel

WORKDIR /root

# Install NodeJS
#RUN apt-get update \
#    && apt-get install -y curl git perl wget \
#    && wget -O - https://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add - \
#    && apt-get upgrade -y \
#    && curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash - \
#    && apt-get install -y nodejs \
#    && npm install -g pm2 \
#    && apt-get clean \
#    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
#    && apt-get autoremove -y

# Install Ethereum Network Intelligence API
#RUN git clone https://github.com/cryptol0g1c/eth-net-intelligence-api.git \
#    && cd eth-net-intelligence-api \
#    && npm install

#COPY ./config-main.toml ./
#COPY ./config-validator.toml ./
#COPY ./config-rpc.toml ./
#COPY ./config.toml ./
#COPY ./nodes.txt ./
#COPY ./sentinel.json ./
COPY ./docker-entrypoint /usr/local/bin/

RUN chmod +x /usr/local/bin/docker-entrypoint

ENTRYPOINT ["docker-entrypoint"]
