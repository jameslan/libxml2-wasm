FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

ARG EMSDK_DIR=/emsdk
ARG EMSDK_VERSION=latest
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    curl ca-certificates zip unzip xz-utils bzip2 sed git \
    python3 python3-pip autoconf automake libtool pkg-config \
    ccache make cmake ninja-build vim less htop && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/emscripten-core/emsdk.git $EMSDK_DIR && \
    cd $EMSDK_DIR && ./emsdk install ${EMSDK_VERSION} && ./emsdk activate ${EMSDK_VERSION} && \
    echo ". $EMSDK_DIR/emsdk_env.sh > /dev/null 2>&1" >> /etc/bash.bashrc && \
    echo ". $EMSDK_DIR/emsdk_env.sh > /dev/null 2>&1" >> /home/node/.bashrc && \
    chown -R node:node /home/node

RUN mkdir -p /home/node/.ccache && chown -R node:node /home/node/.ccache && \
    ccache --max-size=500M && ccache --set-config=compression=true && \
    mkdir -p /usr/local/bin/ccache-wrappers && \
    for c in gcc g++ cc c++ clang clang++; do \
      echo -e '#!/bin/bash\nexec ccache /usr/bin/'"$c"' "$@"' > /usr/local/bin/ccache-wrappers/$c && \
      chmod +x /usr/local/bin/ccache-wrappers/$c; \
    done

RUN git config --global core.autocrlf input && \
    git config --global core.eol lf && \
    git config --global init.defaultBranch main && \
    git config --global --add safe.directory '*'

COPY --chown=node:node post-create.sh /usr/local/bin/post-create.sh
RUN chmod +x /usr/local/bin/post-create.sh && sed -i 's/\r$//' /usr/local/bin/post-create.sh

ENV EMSDK=$EMSDK_DIR \
    EMSCRIPTEN=$EMSDK_DIR/upstream/emscripten \
    PATH="$EMSDK_DIR:$EMSDK_DIR/upstream/emscripten:/usr/local/bin/ccache-wrappers:$PATH" \
    CCACHE_DIR=/home/node/.ccache

USER node
WORKDIR /workspaces

LABEL maintainer="libxml2-wasm contributors" \
      description="Dev environment for libxml2-wasm with Emscripten and Node.js" \
      version="1.0"
