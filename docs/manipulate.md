---
title: Working with XmlDocument
---
# Working with XmlDocument

## Query Nodes with XPath

{@link libxml2-wasm!XmlDocument | `XmlDocument`} and {@link libxml2-wasm!XmlNode | `XmlNode`}
have {@link libxml2-wasm!XmlNode.get |`get`} and {@link libxml2-wasm!XmlNode.find | `find`}
that both use XPath to locate nodes.
The difference between these two methods is that `get` returns the first node it finds,
while `find` returns all of them.

Here’s an example:

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.fromString('<note><to>Amy</to><to>Bob</to></note>');
console.log(doc.root.get('to').content); // Amy
console.log(doc.root.find('to').map((node) => node.content).join()); // Amy,Bob
doc.dispose();
```

When an XPath is used many times,
To avoid redundant parsing of XPath strings when using them multiple times,
you could create an {@link libxml2-wasm!XmlXPath | `XmlXPath`} object.

```js
import { XmlDocument, XmlXPath } from 'libxml2-wasm';

const xpath = XmlXPath.compile('/book/title');
const doc1 = XmlDocument.fromString('<book><title>Harry Potter</title></book>');
const doc2 = XmlDocument.fromString('<book><title>Learning XML</title></book>');
console.log(doc1.get(xpath).content); // Harry Potter
console.log(doc2.get(xpath).content); // Learning XML
doc1.dispose();
doc2.dispose();
xpath.dispose();
```

Note that, like `XmlDocument`, `XmlXPath` owns native memory and requires explicit disposal.

Although `get` and `find` can be used to retrieve attributes of an element,
{@link libxml2-wasm!XmlElement.attr | `attr()`} and {@link libxml2-wasm!XmlElement.attrs | `attrs`} could be more efficient.
Instead of analyzing the XPath string,
they directly search the attribute array of the current element.

Here’s an example:

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.fromString('<line from="left" to="right"/>');
console.log(doc.root.get('@from').value); // left
console.log(doc.root.attr('from').value); // left
console.log(doc.root.find('@*').map((node) => node.value).join()); // left,right
console.log(doc.root.attrs.map((node) => node.value).join()); // left,right
doc.dispose();
```

## Traverse the XML DOM tree

The XML DOM represents an XML document as a hierarchical tree structure.
libxml2-wasm provides different methods and properties so that you can traverse in the tree from any node,

- Each node has a parent, and the root node’s parent is `null`.
To access the parent node, use {@link libxml2-wasm!XmlNode#parent | `XmlNode.parent`};
- An `XmlElement` may contain children as a linked list.
To find the first and last children of an `XmlElement`,
use {@link libxml2-wasm!XmlElement#firstChild | `XmlElement.firstChild`} and {@link libxml2-wasm!XmlElement#lastChild | `XmlElement.lastChild`},
respectively;
- {@link libxml2-wasm!XmlTreeNode#prev | `XmlTreeNode.prev`} and {@link libxml2-wasm!XmlTreeNode#next | `XmlTreeNode.next`} allow you to navigate through this linked list.
- An `XmlElement` may also contain attributes and namespace declarations within the opening tag.
To retrieve all attributes, use {@link libxml2-wasm!XmlElement#attrs | `XmlElement.attrs`}.
To find a specific attribute, use {@link libxml2-wasm!XmlElement#attr | `XmlElement.attr()`}.
To retrieve namespace declarations, use {@link libxml2-wasm!XmlElement#nsDeclarations | `XmlElement.nsDeclarations`}.

It’s important to note that the XML format is preserved using `XmlText`.
For instance, in the following XML example,
the children of the `docs` element are `XmlComment("First Comment")`, `XmlText("\n  ")`, `XmlElement("doc")` and `XmlText("\n")`.

```
<docs><!--First Comment-->
  <doc/>
</docs>
```

## Validate XML

To validate an XML document against an XSD file, create the validator from the schema first,
then use it to validate the document.

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

In the above code snippet, the XSD schema is parsed as an `XmlDocument` using `XmlDocument.fromBuffer` first,
and then create a validator using `XsdValidator.fromDoc`.

Similar to an `XmlDocument`, the validator needs to be disposed too.

### XSD Include/Import

`xsd:include` and `xsd:import` are supported with virtual IO.
Refer to the [Virtual IO](io.md#virtualio-and-xinclude-experimental) document for more information.

### RELAX NG

RELAX NG is also supported, with a corresponding validator class {@link libxml2-wasm!RelaxNGValidator | `RelaxNGValidator`}.

## Modify XML

With libxml2-wasm, you can either modify an existing XML document or create a new one from scratch.


### Create an XML document

Use {@link libxml2-wasm!XmlDocument.create | `XmlDocument.create`} to create a new `XmlDocument`,
and create its root node using {@link libxml2-wasm!XmlDocument#createRoot | `XmlDocument.createRoot`}.

Here's an example:

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.create();
doc.createRoot('doc');
console.log(doc.toString({ format: false })); // <?xml version="1.0"?><doc/>
```

### Insert a node

If you want to insert a new node as a child of an `XmlElement`,
you can use its methods: {@link libxml2-wasm!XmlElement.addComment | `addComment`},
{@link libxml2-wasm!XmlElement#addCData | `addCData`}, {@link libxml2-wasm!XmlElement#addText | `addText`}
and {@link libxml2-wasm!XmlElement#addElement | `addElement`}.
These methods append the new node to the end of the children list and work even if the `XmlElement` doesn’t have any children.

However, if you need to add the new node in the middle of the children list,
you can find a child node as a reference point and either,
- insert a new node in front of it using {@link libxml2-wasm!XmlTreeNode | `XmlTreeNode`}'s
{@link libxml2-wasm!XmlTreeNode#prependComment | `prependComment`},
{@link libxml2-wasm!XmlTreeNode#prependCData | `prependCData`},
{@link libxml2-wasm!XmlTreeNode#prependText | `prependText`},
and {@link libxml2-wasm!XmlTreeNode#prependElement | `prependElement`}, or
- append it behind it using
{@link libxml2-wasm!XmlTreeNode#appendComment | `appendComment`},
{@link libxml2-wasm!XmlTreeNode#appendCData | `appendCData`},
{@link libxml2-wasm!XmlTreeNode#appendText | `appendText`},
and {@link libxml2-wasm!XmlTreeNode#appendElement | `appendElement`}.

Adding attributes and namespace declarations is different because they are in-tag nodes of `XmlElement`,
and their order doesn’t affect the semantics.
You can add an attribute using {@link libxml2-wasm!XmlElement#setAttr | `XmlElement.setAttr`}
and add a namespace declaration using {@link libxml2-wasm!XmlElement#addNsDeclaration | `XmlElement.addNsDeclaration`}.

Here’s an example of how to add a comment, an element, and an attribute to an `XmlElement`:

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.fromString('<books><book/></books>');
const book = doc.root.firstChild;
book.prependComment('all books');
book.appendElement('book');
book.setAttr('order, '1');
doc.toString({ format: false }); // '<?xml version="1.0"?>\n<books><!--all books--><book order="1"/><book/></books>\n'
```

### Remove a node

A node can be removed from the DOM tree by invoking its {@link libxml2-wasm!XmlNode#remove | `remove`} method.

Here’s an example of removing the first `book` element:

```js
import { XmlDocument } from 'libxml2-wasm';

const doc = XmlDocument.fromString('<books><book><title>Harry Potter</title></book><book/></books>');
doc.root.firstChild.remove();
doc.toString({ format: false }); // '<?xml version="1.0"?>\n<books><book/></books>'
```

### Modify a node

Read/write property {@link libxml2-wasm!XmlSimpleNode#content | `content`}
can be used to update `XmlText`, `XmlComment`, or `XmlCData`.
For `XmlAttribute`, the {@link libxml2-wasm!XmlAttribute#value | `value`} property can be used,
and {@link libxml2-wasm!XmlAttribute#content | `content`} is still provided for backward compatibility and convenience.

{@link libxml2-wasm!XmlElement#content | `XmlElement.contnet`} is read-only
and is used to retrieve the element’s text when it’s simple.
It’s not intended for updating the element.
