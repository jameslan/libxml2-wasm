---
title: Streaming with SAX
---

# Streaming XML with the SAX Push Parser

{@link libxml2-wasm!XmlSaxParser | `XmlSaxParser`} exposes libxml2's push parser together with its SAX2 callback interface.
Instead of building an {@link libxml2-wasm!XmlDocument | `XmlDocument`} in memory,
the parser reports the content of the document through callbacks while it is being fed,
chunk by chunk.
Memory usage therefore does not grow proportionally with the document size,
which makes it the right tool for documents that are too large to hold as a DOM tree.

```js
import fs from 'node:fs';
import { XmlSaxParser } from 'libxml2-wasm';

const decoder = new TextDecoder();
let inTitle = false;
let title = '';
using parser = XmlSaxParser.create({
    startElementNs(localName) { inTitle = localName === 'title'; },
    endElementNs() { inTitle = false; },
    characters(data) {
        if (inTitle) title += decoder.decode(data, { stream: true });
    },
});
const stream = fs.createReadStream('doc.xml');
for await (const chunk of stream) {
    parser.push(chunk);
}
parser.finish();
```

All callbacks of the {@link libxml2-wasm!XmlSaxHandler | `XmlSaxHandler`} are optional;
events without a callback are skipped without even crossing the WebAssembly boundary.
The set of reported events is fixed when the parser is created,
but the callback for a reported event is looked up on the handler object at every delivery:
adding a callback that was absent at creation does not enable its event,
while replacing or removing one that was present takes effect at once.

Callbacks run while libxml2 is parsing, on top of its own frames.
{@link libxml2-wasm!XmlSaxParser.stop | `stop`} is therefore the only method
that may be called on the parser from within a callback;
`push`, `finish` and `dispose` throw an
{@link libxml2-wasm!XmlError | `XmlError`} instead of corrupting the parse.

# Feeding the Parser

{@link libxml2-wasm!XmlSaxParser.push | `push`} accepts raw bytes (`Uint8Array`), never pre-decoded strings;
a Node.js `Buffer` is a `Uint8Array` and is accepted as-is.
The chunks may be split at arbitrary byte positions:
tags, entity references and even multi-byte characters may be cut in half between two pushes.
Chunk boundaries are also unrelated to event boundaries -
a single `push` may deliver zero, one or many callbacks,
and one text node may span several pushes.
The parser detects the encoding of the document itself, from its BOM or XML declaration,
and always delivers UTF-8 data to the callbacks.

Call {@link libxml2-wasm!XmlSaxParser.finish | `finish`} after the last chunk;
it processes pending data, invokes `endDocument`,
and reports the errors an incomplete document would otherwise hide.
`endDocument` is delivered for a truncated document too, right before the error is thrown,
so it marks the end of the events rather than a successful parse -
only `finish` returning without throwing does.

# Character Data

The `characters` and `cdataBlock` callbacks receive their data as a `Uint8Array` of UTF-8 bytes.
The array is a view into the WebAssembly memory and is **valid only during the callback** -
and only until the WebAssembly memory grows:
calling into any API of this library, even on another document or parser,
may grow the memory and silently detach the view.
Copy the bytes (for example with `data.slice()`) if they need to be retained,
or before the callback calls into the library.

libxml2 may deliver one text node as several consecutive callbacks,
and there is no guarantee that the split falls on a UTF-8 character boundary.
Decode the concatenated bytes, or use a streaming `TextDecoder`:

```js
const decoder = new TextDecoder();
let text = '';
const parser = XmlSaxParser.create({
    characters(data) { text += decoder.decode(data, { stream: true }); },
});
```

Passing bytes instead of strings lets the application decode only what it needs:
skipping a node with hundreds of megabytes of embedded base64 content costs
no more than reading `data.length`,
without any string allocation.
Element and attribute names, attribute values, comments and processing instructions
are small, so they are delivered as JavaScript strings.

# Entities

Predefined entities (`&amp;` …), character references (`&#xA9;` …) and
entities declared in the internal DTD subset are substituted in element content,
and their replacement text is reported through the regular callbacks:
`characters` for character data and,
should the entity contain markup, the element callbacks for that markup.

External entities follow libxml2's usual rules, shared with DOM parsing:
nothing is loaded by default - the WebAssembly module has no I/O of its own.
When {@link libxml2-wasm!ParseOption.XML_PARSE_NOENT | `XML_PARSE_NOENT`} is set,
libxml2 attempts to load external entities through the registered
[Virtual IO input providers](io.md#virtualio-and-xinclude-experimental);
set {@link libxml2-wasm!ParseOption.XML_PARSE_NO_XXE | `XML_PARSE_NO_XXE`}
to forbid that for untrusted documents.
The external DTD subset itself is never loaded -
{@link libxml2-wasm!ParseOption.XML_PARSE_DTDLOAD | `XML_PARSE_DTDLOAD`} has no effect here -
so entity declarations are only picked up from the internal subset.

Two quirks are inherited from libxml2's SAX interface, both in **attribute** values:
an ampersand - however it is written, `&amp;` or `&#38;` -
is reported as the character reference `&#38;`,
to protect a later re-expansion against double substitution,
and a reference to an entity declared in the DTD is passed through
literally (`&e;`), not substituted.
Set {@link libxml2-wasm!ParseOption.XML_PARSE_NOENT | `XML_PARSE_NOENT`}
to receive fully substituted attribute values instead:

```xml
<!DOCTYPE doc [<!ENTITY e "value">]>
<doc a="x&amp;y" b="&e;"/>
```

`a` is reported as `x&#38;y` and `b` as `&e;`;
with `XML_PARSE_NOENT` they are `x&y` and `value`.

# Errors

{@link libxml2-wasm!XmlSaxParser.push | `push`} throws an
{@link libxml2-wasm!XmlParseError | `XmlParseError`} as soon as a chunk makes the document unparsable,
and {@link libxml2-wasm!XmlSaxParser.finish | `finish`} additionally fails on
error-level diagnostics (for example namespace errors), like DOM parsing does.
Warning-level diagnostics never interrupt parsing;
they are collected in {@link libxml2-wasm!XmlSaxParser.warnings | `warnings`}.
{@link libxml2-wasm!XmlSaxParser.stop | `stop`} ends parsing before `finish` can raise that
error, so error-level diagnostics collected up to that point are only available through
{@link libxml2-wasm!XmlSaxParser.errors | `errors`}.

# Parser Options and Large Content

Plain character data is streamed through `characters` incrementally,
so a text node of any size can be processed without special options.
However, libxml2 buffers a few constructs completely before reporting them -
CDATA sections in particular - and limits them to 10MB.
Set {@link libxml2-wasm!ParseOption.XML_PARSE_HUGE | `XML_PARSE_HUGE`} to lift this limit:

```js
import { ParseOption, XmlSaxParser } from 'libxml2-wasm';

const parser = XmlSaxParser.create(handler, { option: ParseOption.XML_PARSE_HUGE });
```

{@link libxml2-wasm!ParseOption.XML_PARSE_DTDVALID | `XML_PARSE_DTDVALID`} is rejected by
`create`: libxml2 validates against the document tree, which this parser deliberately does not
build, so the option would silently accept invalid documents.
Default attributes declared in the internal DTD subset are added to `startElementNs`'s
`attributes` array only when
{@link libxml2-wasm!ParseOption.XML_PARSE_DTDATTR | `XML_PARSE_DTDATTR`} is set,
matching DOM parsing; otherwise they are omitted.
As noted above, the option's implied `XML_PARSE_DTDLOAD` has no effect on the push parser,
so this only applies to defaults declared in the internal subset.

The options that {@link libxml2-wasm!ParseOption | `ParseOption`} documents as
not supported by the push parser cannot be relied on here either.
{@link libxml2-wasm!ParseOption.XML_PARSE_NOBLANKS | `XML_PARSE_NOBLANKS`} has no effect.
{@link libxml2-wasm!ParseOption.XML_PARSE_RECOVER | `XML_PARSE_RECOVER`} does change what is
reported - libxml2 keeps parsing past a fatal error, so the events of the chunk being pushed
run to its end and the thrown error carries every diagnostic instead of the first -
but the call still throws and the parser still accepts no further input,
so it cannot be used to read a broken document to its end.

# Stopping Early

{@link libxml2-wasm!XmlSaxParser.stop | `stop`} terminates parsing without raising an error,
for example when the interesting part of the document has already been seen.
It may be called from within a handler callback;
the `push` call being processed returns normally and no further events are delivered.
Release the parser once that `push` has returned, not from the callback itself.

A stopped parser accepts nothing further, `finish` included, so a feeding loop has to
leave on {@link libxml2-wasm!XmlSaxParser.terminated | `terminated`}:

```js
using parser = XmlSaxParser.create(handler);
for await (const chunk of stream) {
    if (parser.terminated) break;
    parser.push(chunk);
}
if (!parser.terminated) parser.finish();
```

# Memory Management

Like all wrapper objects owning libxml2 memory,
the parser must be released with {@link libxml2-wasm!disposable.XmlDisposable#dispose | `dispose`},
or by declaring it with `using`.
Disposing is required whether parsing completed, failed, or was stopped -
see [Memory Management](mem.md).
