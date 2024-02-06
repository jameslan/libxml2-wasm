---
layout: home
---

# libxml2-wasm

[![CI Build on master](https://github.com/jameslan/libxml2-wasm/actions/workflows/build.yml/badge.svg)](https://github.com/jameslan/libxml2-wasm/actions/workflows/build.yml)
[![npm](https://img.shields.io/npm/v/libxml2-wasm?logo=npm)](https://www.npmjs.com/package/libxml2-wasm)

## Why another xml lib?

There are two common ways to implement an xml library for nodeJs:

- Use a native xml library, such as [libxml2](https://gitlab.gnome.org/GNOME/libxml2),
and wrap it as a runtime plugin.
- Write a pure javascript library that parses and manipulates xml.

Both of these methods have advantages and disadvantages:

- A native plugin can offer the best performance and functionality,
but it is not easy to distribute.
It requires either compiling the plugin on the user's machine,
or providing prebuilt binaries for different environments.
- A pure javascript library can run on any platform and does not need compilation,
but it may have lower performance and less features.
Some javascript libraries sacrifice some functionality to improve their speed.

Now we have a third way to implement an xml library for nodeJs:
compile libxml2 to WebAssembly and use it as a javascript module.
This approach has several benefits:

- Good performance: the string api of this library has a comparable performance to the native plugin,
and much better than pure javascript implementations;
the buffer api(no string conversion) has an impressive performance in the benchmark,
which defeats the plugin easily.
- Better compatibility: no compilation by the user, and supports browsers too.
- Comprehensive functionality (To be finished): backed by libxml2,
we just need some wrappers that can be called by javascript.

## Supported Environments

This library is an ES module and uses [top level await](https://caniuse.com/?search=top%20level%20await),
it requires the minimum version of the following environments,

|Environment|Version|
|:---:|:---:|
|NodeJs|v16+|
|Chrome|V89+|
|Edge|V89+|
|Safari|v15+|

## Getting Started

Install `lbixml2-wasm` package:

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

**Note**: `dispose()` is required to avoid memory leak.

For more detail, see the [API Doc](https://jameslan.github.io/libxml2-wasm/index.html).
