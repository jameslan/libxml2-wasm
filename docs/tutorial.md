---
title: Getting Started
---

# Install

Install the [`libxml2-wasm` npm package](https://www.npmjs.com/package/libxml2-wasm) in your most convenient way, e.g.

```shell
npm i libxml2-wasm
```

# Import The Lib

`libxml2-wasm` is an ES module, importing it are different between ES module and commonJS module.

## ESM

Import it directly.

```js
import { XmlDocument } from 'libxml2-wasm';
const doc = XmlDocument.fromString('<note><to>Tove</to></note>');
doc.dispose();
```

## CommonJS

Dynamic import is needed:

```js
import('libxml2-wasm').then(({ XmlDocument }) => {
    const doc = XmlDocument.fromString('<note><to>Tove</to></note>');
    doc.dispose();
});
```

**IMPORTANT**: {@link disposable!XmlDisposable#dispose | `dispose()`} is required to avoid memory leak.


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
thus {@link XmlDocument.fromBuffer | `XmlDocument.fromBuffer`} is much faster than {@link XmlDocument.fromString | `XmlDocument.fromString`}.
See the [benchmark](performance.md).

# Query Nodes

{@link XmlNode | `XmlNode`} has {@link XmlNode.get |`get`} and {@link XmlNode.find | `find`} methods which both use xpath to find the node.
Their different is, `get` returns the first found node while `find` returns all found nodes.

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.fromString('<note><to>Amy</to><to>Bob</to></note>');
console.log(doc.root.get('to').content); // Amy
console.log(doc.root.find('to').map((node) => node.content).join()); // Amy,Bob
doc.dispose();
```

Although `get` and `find` can be used to get attributes of an element,
{@link XmlElement.attr | `attr()`} and {@link XmlElement.attrs | `attrs`} could be more efficient:

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.fromString('<line from="left" to="right"/>');
console.log(doc.root.get('@from').content); // left
console.log(doc.root.attr('from').content); // left
console.log(doc.root.find('@*').map((node) => node.content).join()); // left,right
console.log(doc.root.attrs.map((node) => node.content).join()); // left,right
doc.dispose();
```

When an XPath is used many times,
you could create an {@link XmlXPath | `XmlXPath`} object to avoid redundantly parsing XPath string.

```js
import { XmlDocument, XmlXPath } from 'libxml2-wasm';

const xpath = new XmlXPath('/book/title');
const doc1 = XmlDocument.fromString('<book><title>Harry Potter</title></book>');
const doc2 = XmlDocument.fromString('<book><title>Learning XML</title></book>');
console.log(doc1.get(xpath).content); // Harry Potter
console.log(doc2.get(xpath).content); // Learning XML
doc1.dispose();
doc2.dispose();
xpath.dispose();
```

Note that similar to `XmlDocument`, `XmlXPath` owns native memory and needs to be disposed explicitly.

# Validating XML

To validate an XML, create the validator from the schema first,
then use the validator to validate the XML document.

```js
import fs from 'node:fs';
import { XmlDocument, XsdValidator } from 'libxml2-wasm';

const schema = XmlDocument.fromBuffer(fs.readFileSync('schema.xsd'));
const validator = XsdValidator.fromDoc(schema);

const doc = XmlDocument.fromBuffer(fs.readFileSync('document.xml'));
try {
    validator.validate(doc);
} catch (err) {
    console.log(err.message);
}

doc.dispose();
validator.dispose();
schema.dispose();
```

RELAX NG is also supported, with another validator class {@link RelaxNGValidator | `RelaxNGValidator`}.
