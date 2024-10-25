---
title: Parsing and Serializing
---

# Parsing XML

libxml2-wasm supports parsing xml from a string or from a buffer:

```js
import fs from 'node:fs';
import { XmlDocument } from 'libxml2-wasm';

const doc1 = XmlDocument.fromString('<note><to>Tove</to></note>');
const doc2 = XmlDocument.fromBuffer(fs.readFileSync('doc.xml'));
doc1.dispose();
doc2.dispose();
```

The underlying libxml2 library processes MBCS(mostly UTF-8) only,
the UTF-16 string in Javascript needs an extra step to be converted,
thus {@link libxml2-wasm!XmlDocument.fromBuffer | `XmlDocument.fromBuffer`} is much faster than {@link libxml2-wasm!XmlDocument.fromString | `XmlDocument.fromString`}.
See the [benchmark](performance.md).

## VirtualIO and XInclude (Experimental)

[XInclude 1.0](https://www.w3.org/TR/xinclude/) is supported.

When libxml2 find `<xi:include>` tag and need the content of another XML,
it uses the callbacks to read the data.

With {@link libxml2-wasm!xmlRegisterInputProvider | `xmlRegisterInputProvider`}, 
an {@link libxml2-wasm!XmlInputProvider | `XmlInputProvider`} object with a set of 4 callbacks could be registered.

These 4 callbacks are
- `match`
- `open`
- `read`
- `close`

First, `match` will be called with the url of the included XML.
if `match` returns `true`,
the other 3 corresponding callbacks will be used to retrieve the content of the XML;
otherwise, other set of callbacks will be considered.

### Relative path
Sometimes the `href` attribute of the xinclude tag has a relative path.
In this case, an initial url could be passed into the parsing function,
so that libxml could calculate the actual url of the included XML.

For example, if the `href` is `sub.xml`,
and the parent XML is parsed in the following call,

```js
const doc = XmlDocument.fromBuffer(
    await fs.readFile('/path/to/doc.xml'),
    { url: 'file:///path/to/doc.xml' },
);
doc.dispose();

```

The registered callbacks will be called with file name `file:///path/to/sub.xml`.

### Node.js

For Node.js user who need the callbacks for local file access,
module {@link nodejs!} predefines {@link nodejs!fsInputProviders | `fsInputProviders`},
which supports file path or file url.
To enable it, register this provider,
or simply call {@link nodejs!xmlRegisterFsInputProviders | `xmlRegisterFsInputProviders`}:

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

# Serialize an XML

{@link libxml2-wasm!XmlDocument.toBuffer | `XmlDocument.toBuffer`} dumps the content of the XML DOM tree into a buffer gradually,
and calls the {@link libxml2-wasm!XmlOutputBufferHandler | `XmlOutputBufferHandler`} to process the data.

Note that UTF-8 is the only supported encoding for now.

Based on `toBuffer`, two more convenience functions are provided:
{@link libxml2-wasm!XmlDocument.toString | `XmlDocument.toString`}  and {@link nodejs!saveDocSync | `saveDocSync`}.

For example, to save an XML to compact string,

```js
xml.toString({ format: false });
```

To save a formatted XML to file in Node.js environment,

```js
import { saveDocSync } from 'libxml2-wasm/lib/nodejs.mjs';

saveDocSync(xml);
```
