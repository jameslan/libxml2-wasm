# libxml2-wasm

[![CI Build on master](https://github.com/jameslan/libxml2-wasm/actions/workflows/build.yml/badge.svg)](https://github.com/jameslan/libxml2-wasm/actions/workflows/build.yml)
[![npm](https://img.shields.io/npm/v/libxml2-wasm?logo=npm)](https://www.npmjs.com/package/libxml2-wasm)

# Why Choose Another XML Library?

When comparing the previous two main approaches —
pure JavaScript implementation and traditional C implementation binding —
WebAssembly offers a unique combination of advantages.
It provides excellent performance while maintaining the best compatibility with modern JavaScript runtimes.

|                               | Javascript Implementation |       Traditional C Binding        |    WebAssembly    |
|-------------------------------|:-------------------------:|:----------------------------------:|:-----------------:|
| Parsing Speed                 |        Average[^1]        |                Fast                |       Fast        |
| C/C++ Toolchain at Runtime    |       Not required        |            Required[^2]            |   Not Required    |
| Prebuilt Binaries             |            N/A            |  One for each OS / Runtime / Arch  | Universal for all |
| Prebuilt Binary Compatibility |            N/A            | May be broken across libc versions |     Very Good     |
| Browser Compatibility         |            Yes            |                 No                 |        Yes        |

## Documentation

https://jameslan.github.io/libxml2-wasm/index.html

# Supported Environments

Due to the usage of WebAssembly, ES module and [top level await](https://caniuse.com/?search=top%20level%20await) etc,
this library requires the minimum version of the following environments,

| Environment |Version|
|:-----------:|:---:|
|   Node.js   |v18+|
|   Chrome    |V89+|
|    Edge     |V89+|
|   Safari    |v15+|

# Features
- Parsing & Querying
- Validating
- Modifying
- Serializing
- XInclude and XSD include/import (experimental)

## Getting started

Install `libxml2-wasm` package:

```shell
npm i libxml2-wasm
```

`libxml2-wasm` is an ES module,
the import process differs between ES modules and CommonJS modules.

### From ES Module

```js
import fs from 'node:fs';
import { XmlDocument } from 'libxml2-wasm';
const doc1 = XmlDocument.fromString('<note><to>Tove</to></note>');
const doc2 = XmlDocument.fromBuffer(fs.readFileSync('doc.xml'));
doc1.dispose();
doc2.dispose();
```

### From CommonJS

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

[^1]: The performance of different XML libraries can vary significantly.
For more information, refer to the [benchmark](docs/performance.md) provided.
[^2]: The requirement of a C/C++ toolchain at runtime can be waived if prebuilt binaries are available.
