---
title: Getting Started
---

# Getting Started

## Install

Install the [`libxml2-wasm` npm package](https://www.npmjs.com/package/libxml2-wasm) in your most convenient way, e.g.

```shell
npm install libxml2-wasm
```

## Import The Lib

`libxml2-wasm` is an ES module, importing it are different between ES module and commonJS module.

### From ESM

Import it directly.

```js
import { XmlDocument } from 'libxml2-wasm';
const doc = XmlDocument.fromString('<note><to>Tove</to></note>');
doc.dispose();
```

### From CommonJS

Dynamic import is needed:

```js
import('libxml2-wasm').then(({ XmlDocument }) => {
    const doc = XmlDocument.fromString('<note><to>Tove</to></note>');
    doc.dispose();
});
```

**IMPORTANT**: {@link libxml2-wasm!disposable.XmlDisposable#dispose | `dispose()`} is required to avoid memory leak.
For more details please see [Memory Management](mem.md).

**Troubleshooting**: If the target environment set too low,
the transpiler(typescript, or babel etc) may convert `import` to a call to the function `require()`,
which may lead to runtime error.
