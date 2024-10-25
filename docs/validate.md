---
title: Querying and Validating
---
# Querying and Validating

After the XML is parsed into DOM, 

## Query Nodes

{@link libxml2-wasm!XmlNode | `XmlNode`} has {@link libxml2-wasm!XmlNode.get |`get`} and {@link libxml2-wasm!XmlNode.find | `find`} methods which both use xpath to find the node.
Their different is,
`get` returns the first node it found while `find` returns all of thme.

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.fromString('<note><to>Amy</to><to>Bob</to></note>');
console.log(doc.root.get('to').content); // Amy
console.log(doc.root.find('to').map((node) => node.content).join()); // Amy,Bob
doc.dispose();
```

Although `get` and `find` can be used to get attributes of an element,
{@link libxml2-wasm!XmlElement.attr | `attr()`} and {@link libxml2-wasm!XmlElement.attrs | `attrs`} could be more efficient,
because instead of analyzing the xpath string,
they search attribute array of the current element directly:

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
you could create an {@link libxml2-wasm!XmlXPath | `XmlXPath`} object to avoid redundantly parsing XPath string.

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

To validate an XML with an XSD file, create the validator from the schema first,
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

### XSD Include/Import

`xsd:include` and `xsd:import` are supported with virtual IO.
See the Virtual IO section of document of [Parsing and Serializing](io.md)

### RELAX NG
RELAX NG is also supported, with another validator class {@link libxml2-wasm!RelaxNGValidator | `RelaxNGValidator`}.
