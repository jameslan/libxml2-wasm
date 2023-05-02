#!/usr/bin/env bash

rm -rf build
mkdir build
cd build
emconfigure ../libxml2/autogen.sh \
  --without-python \
  --without-http \
  --without-sax1 \
  --without-modules \
  --without-html \
  --without-threads \
  --without-zlib \
  --without-lzma \
  --disable-shared \
  --enable-static
emmake make
emcc -L.libs -lxml2 -o libxml2.wasm --no-entry -s EXPORTED_FUNCTIONS=_xmlNewDoc,_xmlNewDocText,_xmlNewDocComment