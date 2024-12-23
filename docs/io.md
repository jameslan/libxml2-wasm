---
title: Parsing and Serializing
---

# Parsing XML with libxml2-wasm

libxml2-wasm supports parsing XML from either a string or a buffer.

Here’s an example:

```js
import fs from 'node:fs';
import { XmlDocument } from 'libxml2-wasm';

const doc1 = XmlDocument.fromString('<note><to>Tove</to></note>');
const doc2 = XmlDocument.fromBuffer(fs.readFileSync('doc.xml'));
doc1.dispose();
doc2.dispose();
```

The underlying libxml2 library processes MBCS (mostly UTF-8) only.
Therefore, when working with UTF-16 strings in JavaScript,
an additional conversion step is required.
Consequently,
{@link libxml2-wasm!XmlDocument.fromBuffer | `XmlDocument.fromBuffer`} is significantly faster than {@link libxml2-wasm!XmlDocument.fromString | `XmlDocument.fromString`}.
For more information, refer to the [benchmark](performance.md).

## VirtualIO and XInclude (Experimental)

[XInclude 1.0](https://www.w3.org/TR/xinclude/) is now supported.

When libxml2 encounters the `<xi:include>` tag and requires the content of another XML,
it utilizes callbacks to read the data.

With {@link libxml2-wasm!xmlRegisterInputProvider | `xmlRegisterInputProvider`},
an {@link libxml2-wasm!XmlInputProvider | `XmlInputProvider`} object with a set of four callbacks can be registered.

These 4 callbacks are
- `match`: This callback is invoked with the URL of the included XML.
If it returns `true`, the subsequent three callbacks will be used to retrieve the XML content.
Otherwise, other callbacks will be considered.
- `open`: This callback is invoked when the parser starts reading the included XML.
- `read`: This callback is invoked while reading the XML content.
- `close`: This callback is invoked when the parser has finished reading the included XML.

### Relative path

Sometimes, the `href` attribute of the `<xi:include>` tag contains a relative path.
In such cases, an initial URL can be provided to the parsing function so that libxml can calculate the actual URL of the included XML.

For instance, if the `href` attribute is `sub.xml`,
and the parent XML is parsed in the following call:

```js
const doc = XmlDocument.fromBuffer(
    await fs.readFile('/path/to/doc.xml'),
    { url: 'file:///path/to/doc.xml' },
);
doc.dispose();

```

The registered callbacks will be invoked with the file name `file:///path/to/sub.xml`.

### Buffer provider

For the scenario where the included XMLs are stored in memory buffers,
two sets of helper functions are provided:

- Lower level:
Similar to `fs.open`, `fs.read`, and `fs.close`,
{@link libxml2-wasm!openBuffer | `openBuffer`} opens a buffer and returns a file descriptor
that can be used by {@link libxml2-wasm!readBuffer | `readBuffer`} and {@link libxml2-wasm!closeBuffer | `closeBuffer`}
to read and close the buffer, respectively.
You can call these functions when implementing your own provider callbacks.

- Higher level: If all your sources are memory buffers and each has a name specified in the container XML,
you can simply use {@link libxml2-wasm!XmlBufferInputProvider | `XmlBufferInputProvider`}
which implements {@link libxml2-wasm!XmlInputProvider | `XmlInputProvider`} and manages buffers by their names.

# Serialize an XML

{@link libxml2-wasm!XmlDocument.toBuffer | `XmlDocument.toBuffer`} gradually dumps the content of the XML DOM tree into a buffer 
and calls the {@link libxml2-wasm!XmlOutputBufferHandler | `XmlOutputBufferHandler`} to process the data.

Please note that UTF-8 is the only supported encoding at this time.

Based on `toBuffer`, 
{@link libxml2-wasm!XmlDocument.toString | `XmlDocument.toString`} is a convenience functions to get an XML string.

For instance, to save an XML as a compact string, use:

```js
xml.toString({ format: false });
```

# Node.js

For Node.js users who require callbacks for accessing local files,
the module {@link nodejs!} predefines convenience helper functions.

## Input callbacks

{@link nodejs!fsInputProviders | `fsInputProviders`} is the callback implementation reading local files using `node:fs` module,
which supports both file paths and file URLs.
To enable this feature, either register the provider or simply call {@link nodejs!xmlRegisterFsInputProviders | `xmlRegisterFsInputProviders`}:

```js
import { XmlDocument } from 'libxml2-wasm';
import { xmlRegisterFsInputProviders } from 'libxml2-wasm/lib/nodejs.mjs';

xmlRegisterFsInputProviders();

const doc = XmlDocument.fromBuffer(
    await fs.readFile('path/to/doc.xml'),
    { url: 'path/to/doc.xml' },
);
doc.dispose();
```

## Output callbacks

To save an XML to a file in a Node.js environment, open a file and use {@link nodejs!saveDocSync | `saveDocSync`}:

```js
import fs from 'node:fs';
import { saveDocSync } from 'libxml2-wasm/lib/nodejs.mjs';

const fd = fs.openSync('doc.xml', 'w');
saveDocSync(xml, fd);
```

`saveDocSync` uses {@link libxml2-wasm!XmlDocument.toBuffer | `XmlDocument.toBuffer`},
which is faster than {@link libxml2-wasm!XmlDocument.toString | `XmlDocument.toString`}
because similar to [`XmlDocument.fromBuffer` and `XmlDocument.fromString`](performance.md),
it doesn't need to convert UTF-8 to UTF-16 and then convert it back.
