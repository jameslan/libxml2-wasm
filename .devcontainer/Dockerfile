FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

ARG EMSDK_DIR=/emsdk

RUN apt-get update -y && \
    apt-get -y install --no-install-recommends \
        curl \
        ca-certificates \
        zip \
        unzip \
        xz-utils \
        bzip2 \
        sed \
        git-core \
        python3

RUN git clone --depth 1 -- https://github.com/emscripten-core/emsdk.git $EMSDK_DIR && \
    cd $EMSDK_DIR && \
    ./emsdk install latest && \
    ./emsdk activate latest && \
    echo ". $EMSDK_DIR/emsdk_env.sh" >> /etc/bash.bashrc
