---
title: Getting Started
---

# Getting Started

## Install

Install the [`libxml2-wasm` npm package](https://www.npmjs.com/package/libxml2-wasm) using your preferred method,
such as:

```shell
npm install libxml2-wasm
```

## Import The Lib

Now, let’s import the libxml2-wasm module.
Since it’s an ES module,
the import process differs between ES modules and CommonJS modules.

### From ES Module

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

**Important Note:**

Remember to call the {@link libxml2-wasm!disposable.XmlDisposable#dispose | `dispose()`} method on the XmlDocument instance to prevent memory leaks.
For more detailed information on memory management, refer to [Memory Management](mem.md).

**Troubleshooting:**

If the target environment version is set too low,
the transpiler (e.g., TypeScript, Babel, etc.) may convert the `import` statement to a function call to `require()`.
This can lead to runtime errors.

## Parsing HTML

Use {@link libxml2-wasm!XmlDocument.fromHtmlString | `XmlDocument.fromHtmlString`} (or
{@link libxml2-wasm!XmlDocument.fromHtmlBuffer | `fromHtmlBuffer`}) to parse HTML instead of XML.
The HTML parser recovers from broken markup rather than throwing,
and adds implied `<html>`/`<head>`/`<body>` elements as needed.

```js
import { XmlDocument } from 'libxml2-wasm';
const doc = XmlDocument.fromHtmlString('<p>Hello, <b>world</p>');
console.log(doc.get('//p')?.content); // Hello, world
console.log(doc.toString()); // serializes back as HTML syntax, since the document is HTML
doc.dispose();
```
