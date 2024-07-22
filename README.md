# libxml2-wasm

[![CI Build on master](https://github.com/jameslan/libxml2-wasm/actions/workflows/build.yml/badge.svg)](https://github.com/jameslan/libxml2-wasm/actions/workflows/build.yml)
[![npm](https://img.shields.io/npm/v/libxml2-wasm?logo=npm)](https://www.npmjs.com/package/libxml2-wasm)

## Why another xml lib?

Comparing to the previous two main approaches,
pure javascript implementation as well as traditional C implementation binding,
using WebAssembly combines the pros from both sides,
providing good performance while keeping best compatibility with modern Javascript runtime.

| | Javascript Implementation | Traditional C Binding | WebAssembly |
|-|:---:|:---:|:---:|
| Parsing Speed[^1] | Average | Fast | Fast |
| C/C++ Toolchain | Not required | Required[^2] | Not Required |
| Prebuilt Binaries | N/A | One for each OS/Runtime version | Universal for all OS/Runtime versions |
| Prebuilt Binary Compatibility | N/A | May broke across libc versions | Very Good |
| Browser Compatibility | Yes | No | Yes |

## Documentation

https://jameslan.github.io/libxml2-wasm/index.html

## Supported Environments

Due to the usage of WebAssembly, ES module and [top level await](https://caniuse.com/?search=top%20level%20await) etc,
it requires the minimum version of the following environments,

|Environment|Version|
|:---:|:---:|
|NodeJs|v16+|
|Chrome|V89+|
|Edge|V89+|
|Safari|v15+|

## Getting started

Install `libxml2-wasm` package:

```shell
npm i libxml2-wasm
```

`libxml2-wasm` is an ES module, importing it are different between ES module and commonJS module.

### ESM

Import it directly.

```js
import fs from 'node:fs';
import { XmlDocument } from 'libxml2-wasm';
const doc1 = XmlDocument.fromString('<note><to>Tove</to></note>');
const doc2 = XmlDocument.fromBuffer(fs.readFileSync('doc.xml'));
doc1.dispose();
doc2.dispose();
```

### CommonJS

Dynamic import is needed:

```js
const fs = require('node:fs');
import('libxml2-wasm').then(({ XmlDocument }) => {
    const doc1 = XmlDocument.fromString('<note><to>Tove</to></note>');
    const doc2 = XmlDocument.fromBuffer(fs.readFileSync('doc.xml'));
    doc1.dispose();
    doc2.dispose();
});
```

**IMPORTANT**: `dispose()` is required to avoid memory leak.

For more detail, see the [Doc](https://jameslan.github.io/libxml2-wasm/index.html).

[^1]: The speed of different libraries varies a lot, see [benchmark](performance.md).
[^2]: The requirement of C/C++ toolchain may be waived if prebuilt binary is available.

## Development environment

If you'd like to contribute to `libxml2-wasm`, you need a [Node.js](https://nodejs.org/) (version 16 or newer) and an [emscripten](https://emscripten.org/) installation in your environment.

Alternatively, you can use the provided devcontainer. Then you only need a Docker or Podman environment, and VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension. Then you can just run the command "Dev Containers: Reopen in Container" which will provide you a container with the needed development environment. See <https://containers.dev/> for further info.
