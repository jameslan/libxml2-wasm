---
layout: home
---

# Why Another Xml Lib?

Comparing to the previous two main approaches,
pure javascript implementation as well as traditional C implementation binding,
using WebAssembly combines the pros from both sides,
providing good performance while keeping best compatibility with modern Javascript runtime.

| | Javascript Implementation | Traditional C Binding | WebAssembly |
|-|:---:|:---:|:---:|
| Parsing Speed | Average[^1] | Fast | Fast |
| C/C++ Toolchain at Runtime Environment | Not required | Required[^2] | Not Required |
| Prebuilt Binaries | N/A | One for each OS/Runtime version | Universal for all OS/Runtime versions |
| Prebuilt Binary Compatibility | N/A | May broke across libc versions | Very Good |
| Browser Compatibility | Yes | No | Yes |

# Supported Environments

Due to the usage of WebAssembly, ES module and [top level await](https://caniuse.com/?search=top%20level%20await) etc,
it requires the minimum version of the following environments,

|Environment|Version|
|:---:|:---:|
|NodeJs|v16+|
|Chrome|V89+|
|Edge|V89+|
|Safari|v15+|

# Getting Started

## Install

Install the [`libxml2-wasm` npm package](https://www.npmjs.com/package/libxml2-wasm) in your most convenient way, e.g.

```shell
npm i libxml2-wasm
```

## Import the lib

`libxml2-wasm` is an ES module, importing it are different between ES module and commonJS module.

### ESM

Import it directly.

```js
import { XmlDocument } from 'libxml2-wasm';
const doc = XmlDocument.fromString('<note><to>Tove</to></note>');
doc.dispose();
```

### CommonJS

Dynamic import is needed:

```js
import('libxml2-wasm').then(({ XmlDocument }) => {
    const doc = XmlDocument.fromString('<note><to>Tove</to></note>');
    doc.dispose();
});
```

**IMPORTANT**: [`dispose()`](api/classes/XmlDisposable.html#dispose) is required to avoid memory leak.


## Parsing XML

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
thus [`XmlDocument.fromBuffer`](api/classes/XmlDocument.html#fromBuffer) is much faster than [`XmlDocument.fromString`](api/classes/XmlDocument.html#fromString).
See the [benchmark](performance.md).

## Query nodes

[`XmlNode`](api/classes/XmlNode.html) has [`get`](api/classes/XmlNode.html#get) and [`find`](api/classes/XmlNode.html#find) methods which both use xpath to find the node.
Their different is, `get` returns the first found node while `find` returns all found nodes.

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.fromString('<note><to>Amy</to><to>Bob</to></note>');
console.log(doc.root.get('to').content); // Amy
console.log(doc.root.find('to').map((node) => node.content).join()); // Amy,Bob
doc.dispose();
```

Although `get` and `find` can be used to get attributes of an element,
[`attr()`](api/classes/XmlElement.html#attr) and [`attrs`](api/classes/XmlElement.html#attrs) could be more efficient:

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
you could create an [`XmlXPath`](api/classes/XmlXPath.html) object to avoid redundantly parsing XPath string.

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

## Validating XML

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

RELAX NG is also supported, with another validator class [`RelaxNGValidator`](api/classes/RelaxNGValidator.html).

For the further detail of the APIs, please check the [API Doc](https://jameslan.github.io/libxml2-wasm/api/).

---

[^1]: The speed of different libraries varies a lot, see [benchmark](performance.md).
[^2]: The requirement of C/C++ toolchain may be waived if prebuilt binary is available.
