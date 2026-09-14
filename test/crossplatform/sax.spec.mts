import { expect } from 'chai';

import {
    diag,
    ParseOption,
    XmlError,
    XmlParseError,
    XmlSaxParser,
} from '@libxml2-wasm/lib/index.mjs';

import type { XmlSaxHandler } from '@libxml2-wasm/lib/index.mjs';

const encoder = new TextEncoder();

type SaxEvent = [name: string, ...args: unknown[]];

function recordingHandler(events: SaxEvent[]): XmlSaxHandler {
    const decoder = new TextDecoder();
    return {
        startDocument: () => events.push(['startDocument']),
        endDocument: () => events.push(['endDocument']),
        startElementNs: (localName, prefix, namespaceUri, namespaces, attributes) => events
            .push(['startElementNs', localName, prefix, namespaceUri, namespaces, attributes]),
        endElementNs: (localName, prefix, namespaceUri) => events
            .push(['endElementNs', localName, prefix, namespaceUri]),
        characters: (data) => events.push(['characters', decoder.decode(data)]),
        cdataBlock: (data) => events.push(['cdataBlock', decoder.decode(data)]),
        comment: (text) => events.push(['comment', text]),
        processingInstruction: (target, data) => events
            .push(['processingInstruction', target, data]),
    };
}

function parse(
    xml: string | Uint8Array,
    handler: XmlSaxHandler,
    option?: ParseOption,
    chunkSize?: number,
): void {
    const bytes = typeof xml === 'string' ? encoder.encode(xml) : xml;
    const size = chunkSize ?? bytes.length;
    using parser = XmlSaxParser.create(handler, option === undefined ? {} : { option });
    for (let offset = 0; offset < bytes.length; offset += size) {
        parser.push(bytes.subarray(offset, offset + size));
    }
    parser.finish();
}

describe('XmlSaxParser', () => {
    describe('create', () => {
        it('rejects an explicit document encoding', () => {
            expect(() => XmlSaxParser.create({}, { encoding: 'latin1' })).to.throw(
                XmlError,
                'Setting an encoding is not supported',
            );
        });

        it('accepts the utf-8 encoding', () => {
            using parser = XmlSaxParser.create({}, { encoding: 'utf-8' });
            parser.push(encoder.encode('<doc/>'));
            parser.finish();
        });

        it('rejects DTD validation', () => {
            // libxml2 validates against the tree, which this parser doesn't
            // build, so the option would silently accept invalid documents
            expect(() => XmlSaxParser.create({}, {
                option: ParseOption.XML_PARSE_DTDVALID,
            })).to.throw(XmlError, 'DTD validation is not supported');
        });

        it('accepts DTD driven default attributes', () => {
            const attributes: unknown[] = [];
            parse(
                '<!DOCTYPE d [<!ELEMENT d EMPTY><!ATTLIST d a CDATA "dflt">]><d/>',
                {
                    startElementNs: (localName, prefix, namespaceUri, namespaces, attrs) => {
                        attributes.push(...attrs);
                    },
                },
                ParseOption.XML_PARSE_DTDATTR,
            );
            expect(attributes).to.deep.equal([{
                localName: 'a', prefix: null, namespaceUri: null, value: 'dflt',
            }]);
        });

        it('omits DTD driven default attributes without XML_PARSE_DTDATTR', () => {
            const attributes: unknown[] = [];
            parse(
                '<!DOCTYPE d [<!ELEMENT d EMPTY><!ATTLIST d a CDATA "dflt">]><d b="x"/>',
                {
                    startElementNs: (localName, prefix, namespaceUri, namespaces, attrs) => {
                        attributes.push(...attrs);
                    },
                },
            );
            expect(attributes).to.deep.equal([{
                localName: 'b', prefix: null, namespaceUri: null, value: 'x',
            }]);
        });

        it('rejects options this build of libxml2 does not support', () => {
            // SAX1 support is compiled out; without the check libxml2 would
            // silently ignore the option
            expect(() => XmlSaxParser.create({}, {
                option: ParseOption.XML_PARSE_SAX1,
            })).to.throw(XmlError, 'Unsupported parser options');
        });

        it('accepts XML_PARSE_SKIP_IDS although libxml2 reports it unknown', () => {
            using parser = XmlSaxParser.create({}, {
                option: ParseOption.XML_PARSE_SKIP_IDS,
            });
            parser.push(encoder.encode('<doc/>'));
            parser.finish();
        });
    });

    describe('push', () => {
        it('rejects anything but a Uint8Array', () => {
            using parser = XmlSaxParser.create({});
            ['<doc/>', null, undefined, [0x3C], new ArrayBuffer(2)].forEach((bad) => {
                expect(() => parser.push(bad as unknown as Uint8Array)).to.throw(
                    XmlError,
                    'The chunk must be a Uint8Array of the raw document bytes',
                );
            });
        });

        it('rejects a plain object forging the Uint8Array string tag', () => {
            // Object.prototype.toString would report it as a Uint8Array,
            // but its content would be coerced garbage in the wasm memory
            using parser = XmlSaxParser.create({});
            const forged = { [Symbol.toStringTag]: 'Uint8Array', length: 1, 0: 0x3C };
            expect(() => parser.push(forged as unknown as Uint8Array)).to.throw(
                XmlError,
                'The chunk must be a Uint8Array of the raw document bytes',
            );
        });
    });

    describe('events', () => {
        it('reports document, element, text, comment and PI events in order', () => {
            const events: SaxEvent[] = [];
            parse(
                '<?xml version="1.0"?><!--note--><doc a="1"><child>text</child><?pi data?></doc>',
                recordingHandler(events),
            );
            expect(events).to.deep.equal([
                ['startDocument'],
                ['comment', 'note'],
                ['startElementNs', 'doc', null, null, [], [
                    {
                        localName: 'a', prefix: null, namespaceUri: null, value: '1',
                    },
                ]],
                ['startElementNs', 'child', null, null, [], []],
                ['characters', 'text'],
                ['endElementNs', 'child', null, null],
                ['processingInstruction', 'pi', 'data'],
                ['endElementNs', 'doc', null, null],
                ['endDocument'],
            ]);
        });

        it('reports CDATA sections through cdataBlock', () => {
            const events: SaxEvent[] = [];
            parse('<doc><![CDATA[raw <>&]]></doc>', recordingHandler(events));
            expect(events).to.deep.include(['cdataBlock', 'raw <>&']);
        });

        it('reports CDATA sections through characters when cdataBlock is not set', () => {
            let text = '';
            const decoder = new TextDecoder();
            parse('<doc><![CDATA[raw <>&]]></doc>', {
                characters: (data) => {
                    text += decoder.decode(data, { stream: true });
                },
            });
            expect(text).to.equal('raw <>&');
        });

        it('stops reporting startElementNs when it is removed mid-parse', () => {
            const names: string[] = [];
            const handler: XmlSaxHandler = {
                startElementNs: (localName) => {
                    names.push(localName);
                    delete handler.startElementNs;
                },
            };
            using parser = XmlSaxParser.create(handler);
            parser.push(encoder.encode('<doc><a/><b/></doc>'));
            parser.finish();
            expect(names).to.deep.equal(['doc']);
        });

        it('parses documents with a handler without callbacks', () => {
            parse('<doc><child>text</child><!--c--></doc>', {});
        });
    });

    describe('namespaces', () => {
        it('reports namespace declarations and resolved names', () => {
            const events: SaxEvent[] = [];
            parse(
                '<doc xmlns="urn:default" xmlns:p="urn:p" p:a="1"><p:child b="2"/></doc>',
                recordingHandler(events),
            );
            expect(events).to.deep.equal([
                ['startDocument'],
                ['startElementNs', 'doc', null, 'urn:default', [
                    [null, 'urn:default'],
                    ['p', 'urn:p'],
                ], [
                    {
                        localName: 'a', prefix: 'p', namespaceUri: 'urn:p', value: '1',
                    },
                ]],
                ['startElementNs', 'child', 'p', 'urn:p', [], [
                    {
                        localName: 'b', prefix: null, namespaceUri: null, value: '2',
                    },
                ]],
                ['endElementNs', 'child', 'p', 'urn:p'],
                ['endElementNs', 'doc', null, 'urn:default'],
                ['endDocument'],
            ]);
        });
    });

    describe('attributes', () => {
        function attributesOf(xml: string, option?: ParseOption) {
            const attributes: unknown[] = [];
            parse(xml, {
                startElementNs: (localName, prefix, namespaceUri, namespaces, attrs) => attributes
                    .push(...attrs),
            }, option);
            return attributes;
        }

        it('substitutes entities and character references in values', () => {
            expect(attributesOf('<doc a="A &lt;&gt; &#65;"/>')).to.deep.equal([{
                localName: 'a', prefix: null, namespaceUri: null, value: 'A <> A',
            }]);
        });

        it('reports ampersands as &#38; without XML_PARSE_NOENT', () => {
            // libxml2's SAX interface reports the ampersand unexpanded,
            // as a character reference, to prevent double expansion
            expect(attributesOf('<doc a="x&amp;y&#38;z"/>')).to.deep.equal([{
                localName: 'a', prefix: null, namespaceUri: null, value: 'x&#38;y&#38;z',
            }]);
        });

        it('reports plain ampersands with XML_PARSE_NOENT', () => {
            expect(attributesOf(
                '<doc a="x&amp;y&#38;z"/>',
                ParseOption.XML_PARSE_NOENT,
            )).to.deep.equal([{
                localName: 'a', prefix: null, namespaceUri: null, value: 'x&y&z',
            }]);
        });

        it('reports empty values', () => {
            expect(attributesOf('<doc a=""/>')).to.deep.equal([{
                localName: 'a', prefix: null, namespaceUri: null, value: '',
            }]);
        });

        it('passes DTD-declared entity references through without XML_PARSE_NOENT', () => {
            expect(attributesOf('<!DOCTYPE doc [<!ENTITY e "xyz">]><doc a="q&e;r"/>'))
                .to.deep.equal([{
                    localName: 'a', prefix: null, namespaceUri: null, value: 'q&e;r',
                }]);
        });

        it('substitutes DTD-declared entities with XML_PARSE_NOENT', () => {
            expect(attributesOf(
                '<!DOCTYPE doc [<!ENTITY e "xyz">]><doc a="q&e;r"/>',
                ParseOption.XML_PARSE_NOENT,
            )).to.deep.equal([{
                localName: 'a', prefix: null, namespaceUri: null, value: 'qxyzr',
            }]);
        });
    });

    describe('chunked input', () => {
        it('parses one-byte pushes, split inside tags, entities and UTF-8 sequences', () => {
            const events: SaxEvent[] = [];
            let bytes = new Uint8Array(0);
            parse('<doc łđ="češće">A&amp;š&#x1F600;<!--čob--></doc>', {
                ...recordingHandler(events),
                // splits between characters callbacks are not guaranteed to
                // fall on UTF-8 character boundaries: collect raw bytes and
                // decode once at the end
                characters: (data) => {
                    const grown = new Uint8Array(bytes.length + data.length);
                    grown.set(bytes);
                    grown.set(data, bytes.length);
                    bytes = grown;
                },
            }, undefined, 1);
            const text = new TextDecoder().decode(bytes);
            expect(text).to.equal('A&š😀');
            expect(events).to.deep.equal([
                ['startDocument'],
                ['startElementNs', 'doc', null, null, [], [
                    {
                        localName: 'łđ', prefix: null, namespaceUri: null, value: 'češće',
                    },
                ]],
                ['comment', 'čob'],
                ['endElementNs', 'doc', null, null],
                ['endDocument'],
            ]);
        });

        it('decodes character data with a streaming TextDecoder', () => {
            const decoder = new TextDecoder();
            let text = '';
            parse('<doc>šđčćž €😀</doc>', {
                characters: (data) => {
                    text += decoder.decode(data, { stream: true });
                },
            }, undefined, 1);
            expect(text).to.equal('šđčćž €😀');
        });

        it('detects the encoding of UTF-16 input from its BOM', () => {
            const body = '<doc č="ž">tešt</doc>';
            const bytes = new Uint8Array(2 + body.length * 2);
            bytes[0] = 0xFF; // UTF-16LE BOM
            bytes[1] = 0xFE;
            for (let i = 0; i < body.length; i += 1) {
                const code = body.charCodeAt(i);
                bytes[2 + 2 * i] = code % 256;
                bytes[3 + 2 * i] = Math.floor(code / 256);
            }
            const decoder = new TextDecoder();
            const names: string[] = [];
            let attributes: unknown[] = [];
            let text = '';
            parse(bytes, {
                startElementNs: (localName, prefix, namespaceUri, namespaces, attrs) => {
                    names.push(localName);
                    attributes = attrs;
                },
                characters: (data) => {
                    text += decoder.decode(data, { stream: true });
                },
            }, undefined, 3);
            // the callbacks receive UTF-8 regardless of the input encoding
            expect(names).to.deep.equal(['doc']);
            expect(attributes).to.deep.equal([{
                localName: 'č', prefix: null, namespaceUri: null, value: 'ž',
            }]);
            expect(text).to.equal('tešt');
        });
    });

    describe('entities', () => {
        function textOf(xml: string, option?: ParseOption, chunkSize?: number): string {
            const decoder = new TextDecoder();
            let text = '';
            parse(xml, {
                characters: (data) => {
                    text += decoder.decode(data, { stream: true });
                },
            }, option, chunkSize);
            return text;
        }

        it('substitutes predefined entities and character references', () => {
            expect(textOf('<doc>a&amp;b&lt;c&gt;d&#64;e&#x40;f</doc>')).to.equal('a&b<c>d@e@f');
        });

        it('substitutes entities declared in the internal DTD subset', () => {
            expect(textOf('<!DOCTYPE doc [<!ENTITY e "xyz">]><doc>a&e;b</doc>'))
                .to.equal('axyzb');
        });

        it('substitutes entities split across pushes', () => {
            expect(textOf('<doc>a&amp;b</doc>', undefined, 1)).to.equal('a&b');
        });

        it('reports markup in entity replacement text as element events', () => {
            const events: SaxEvent[] = [];
            parse(
                '<!DOCTYPE doc [<!ENTITY m "<b>t</b>">]><doc>&m;</doc>',
                recordingHandler(events),
            );
            expect(events).to.deep.equal([
                ['startDocument'],
                ['startElementNs', 'doc', null, null, [], []],
                ['startElementNs', 'b', null, null, [], []],
                ['characters', 't'],
                ['endElementNs', 'b', null, null],
                ['endElementNs', 'doc', null, null],
                ['endDocument'],
            ]);
        });
    });

    describe('large content', () => {
        // libxml2 limits constructs it has to buffer to 10MB (XML_MAX_TEXT_LENGTH,
        // XML_MAX_LOOKUP_LIMIT) unless XML_PARSE_HUGE is set
        const bigLength = 11 * 1024 * 1024;
        const chunk = new Uint8Array(256 * 1024).fill(0x61); // "a"

        function pushBig(parser: XmlSaxParser, prologue: string, epilogue: string): void {
            parser.push(encoder.encode(prologue));
            for (let pushed = 0; pushed < bigLength; pushed += chunk.length) {
                parser.push(chunk);
            }
            parser.push(encoder.encode(epilogue));
            parser.finish();
        }

        it('streams a text node larger than 10MB without XML_PARSE_HUGE', () => {
            let length = 0;
            using parser = XmlSaxParser.create({
                characters: (data) => {
                    length += data.length;
                },
            });
            pushBig(parser, '<doc>', '</doc>');
            expect(length).to.equal(bigLength);
        });

        it('rejects a CDATA section larger than 10MB without XML_PARSE_HUGE', () => {
            using parser = XmlSaxParser.create({});
            expect(() => pushBig(parser, '<doc><![CDATA[', ']]></doc>')).to.throw(
                XmlParseError,
                /CData section too big|Buffer size limit exceeded/,
            );
        });

        it('accepts a CDATA section larger than 10MB with XML_PARSE_HUGE', () => {
            let length = 0;
            using parser = XmlSaxParser.create(
                {
                    cdataBlock: (data) => {
                        length += data.length;
                    },
                },
                { option: ParseOption.XML_PARSE_HUGE },
            );
            pushBig(parser, '<doc><![CDATA[', ']]></doc>');
            expect(length).to.equal(bigLength);
        });
    });

    describe('errors', () => {
        it('throws XmlParseError with detail from finish on premature end', () => {
            using parser = XmlSaxParser.create({});
            parser.push(encoder.encode('<doc>'));
            expect(() => parser.finish()).to.throw(
                XmlParseError,
                'Premature end of data in tag doc line 1\n',
            ).with.deep.property('details', [{
                message: 'Premature end of data in tag doc line 1\n',
                level: 3,
                line: 1,
                col: 6,
            }]);
        });

        it('throws XmlParseError from push on a malformed chunk', () => {
            using parser = XmlSaxParser.create({});
            parser.push(encoder.encode('<doc>'));
            expect(() => parser.push(encoder.encode('</wrong>'))).to.throw(
                XmlParseError,
                'Opening and ending tag mismatch: doc line 1 and wrong\n',
            ).with.nested.property('details[0].level', 3);
            // parsing cannot continue afterwards
            expect(() => parser.push(encoder.encode('x'))).to.throw(
                XmlError,
                'Parsing is already terminated',
            );
        });

        it('throws XmlParseError on an empty document', () => {
            using parser = XmlSaxParser.create({});
            expect(() => parser.finish()).to.throw(XmlParseError, 'Document is empty\n');
        });

        it('fails the parse on error-level diagnostics at finish', () => {
            // an undeclared namespace prefix is a non-fatal (level 2) error:
            // events are still delivered, and finish() fails like DOM parsing does
            const names: string[] = [];
            using parser = XmlSaxParser.create({
                startElementNs: (localName) => {
                    names.push(localName);
                },
            });
            parser.push(encoder.encode('<doc><p:child/></doc>'));
            expect(() => parser.finish()).to.throw(
                XmlParseError,
                'Namespace prefix p on child is not defined\n',
            ).with.nested.property('details[0].level', 2);
            expect(names).to.deep.equal(['doc', 'child']);
        });

        it('collects warning-level diagnostics without failing', () => {
            using parser = XmlSaxParser.create({});
            parser.push(encoder.encode('<doc xmlns="relative"/>'));
            parser.finish();
            expect(parser.warnings).to.deep.equal([{
                message: 'xmlns: URI relative is not absolute\n',
                level: 1,
                line: 1,
                col: 22,
            }]);
        });

        it('attributes diagnostics to the document url', () => {
            using parser = XmlSaxParser.create({}, { url: 'invoice.xml' });
            parser.push(encoder.encode('<doc>'));
            expect(() => parser.finish()).to.throw(XmlParseError)
                .with.nested.property('details[0].file', 'invoice.xml');
        });
    });

    describe('finish', () => {
        it('rejects further input after finish', () => {
            using parser = XmlSaxParser.create({});
            parser.push(encoder.encode('<doc/>'));
            parser.finish();
            expect(() => parser.push(encoder.encode('<doc/>'))).to.throw(
                XmlError,
                'Parsing is already terminated',
            );
            expect(() => parser.finish()).to.throw(XmlError, 'Parsing is already terminated');
        });
    });

    describe('stop', () => {
        it('stops before any input has been pushed', () => {
            using parser = XmlSaxParser.create({});
            parser.stop();
            expect(() => parser.push(encoder.encode('<doc/>'))).to.throw(
                XmlError,
                'Parsing is already terminated',
            );
        });

        it('stops the parse from within a callback without error', () => {
            const names: string[] = [];
            using parser = XmlSaxParser.create({
                startElementNs: (localName) => {
                    names.push(localName);
                    if (names.length === 2) {
                        parser.stop();
                    }
                },
            });
            parser.push(encoder.encode('<doc><a/><b/><c/></doc>'));
            expect(names).to.deep.equal(['doc', 'a']);
        });

        it('rejects further input after stop', () => {
            using parser = XmlSaxParser.create({});
            parser.push(encoder.encode('<doc>'));
            expect(parser.terminated).to.be.false;
            parser.stop();
            expect(parser.terminated).to.be.true;
            expect(() => parser.push(encoder.encode('</doc>'))).to.throw(
                XmlError,
                'Parsing is already terminated',
            );
            expect(() => parser.finish()).to.throw(XmlError, 'Parsing is already terminated');
        });

        it('lets a feeding loop end on the terminated flag', () => {
            const names: string[] = [];
            using parser = XmlSaxParser.create({
                startElementNs: (localName) => {
                    names.push(localName);
                    if (localName === 'b') {
                        parser.stop();
                    }
                },
            });
            const chunks = ['<doc>', '<a/>', '<b/>', '<c/>', '</doc>'];
            for (let i = 0; i < chunks.length && !parser.terminated; i += 1) {
                parser.push(encoder.encode(chunks[i]));
            }
            if (!parser.terminated) {
                parser.finish();
            }
            expect(names).to.deep.equal(['doc', 'a', 'b']);
        });

        it('has no effect on a terminated or disposed parser', () => {
            const parser = XmlSaxParser.create({});
            parser.push(encoder.encode('<doc/>'));
            parser.finish();
            parser.stop();
            parser.dispose();
            parser.stop();
        });

        it('lets finish return cleanly when stopped from endDocument', () => {
            using parser = XmlSaxParser.create({
                endDocument: () => parser.stop(),
            });
            parser.push(encoder.encode('<doc/>'));
            parser.finish();
        });

        it('does not mask earlier error-level diagnostics from finish', () => {
            // stop() discards the error code of the call it aborts, but a
            // clean finish() return still has to mean well-formed input
            using parser = XmlSaxParser.create({
                endDocument: () => parser.stop(),
            });
            parser.push(encoder.encode('<doc><p:child/></doc>'));
            expect(() => parser.finish()).to.throw(
                XmlParseError,
                'Namespace prefix p on child is not defined\n',
            );
        });

        it('exposes error-level diagnostics through errors once stopped', () => {
            // finish() can no longer be called after stop(), so it is the
            // only way left to see a diagnostic collected before stopping
            using parser = XmlSaxParser.create({
                startElementNs: (localName) => {
                    if (localName === 'child') {
                        parser.stop();
                    }
                },
            });
            parser.push(encoder.encode('<doc><p:child/></doc>'));
            expect(parser.warnings).to.deep.equal([]);
            expect(parser.errors).to.have.lengthOf(1);
            expect(parser.errors[0].message)
                .to.equal('Namespace prefix p on child is not defined\n');
        });
    });

    describe('dispose', () => {
        it('reports a disposed parser as terminated', () => {
            const parser = XmlSaxParser.create({});
            parser.push(encoder.encode('<doc>'));
            expect(parser.terminated).to.be.false;
            parser.dispose();
            // a feeding loop leaving on `terminated` must not push again
            expect(parser.terminated).to.be.true;
        });
    });

    describe('re-entrancy', () => {
        it('rejects push from within a callback', () => {
            const parser = XmlSaxParser.create({
                startElementNs: () => parser.push(encoder.encode('<nested/>')),
            });
            expect(() => parser.push(encoder.encode('<doc><child/></doc>'))).to.throw(
                XmlError,
                'The parser cannot be re-entered from a handler callback',
            );
            parser.dispose();
        });

        it('rejects finish from within a callback', () => {
            const parser = XmlSaxParser.create({
                endDocument: () => parser.finish(),
            });
            parser.push(encoder.encode('<doc/>'));
            expect(() => parser.finish()).to.throw(
                XmlError,
                'The parser cannot be re-entered from a handler callback',
            );
            parser.dispose();
        });

        it('rejects dispose from within a callback', () => {
            // freeing the context here would leave libxml2 parsing on freed memory
            const parser = XmlSaxParser.create({
                characters: () => parser.dispose(),
            });
            expect(() => parser.push(encoder.encode('<doc>text</doc>'))).to.throw(
                XmlError,
                'The parser cannot be disposed from a handler callback',
            );
            // the parser survived and can be released now that parsing is over
            parser.dispose();
            expect(() => parser.push(encoder.encode('x'))).to.throw(
                XmlError,
                'The parser is disposed',
            );
        });

        it('reports being inside a callback rather than being stopped', () => {
            // both conditions hold here; the re-entrancy is the useful diagnostic
            using parser = XmlSaxParser.create({
                startElementNs: () => {
                    parser.stop();
                    expect(() => parser.push(encoder.encode('x'))).to.throw(
                        XmlError,
                        'The parser cannot be re-entered from a handler callback',
                    );
                },
            });
            parser.push(encoder.encode('<doc/>'));
        });

        it('allows driving another parser from within a callback', () => {
            // the guard is per parser, not global
            const inner: SaxEvent[] = [];
            using nested = XmlSaxParser.create(recordingHandler(inner));
            const outer: SaxEvent[] = [];
            const handler = recordingHandler(outer);
            using parser = XmlSaxParser.create({
                ...handler,
                startElementNs: (...args) => {
                    handler.startElementNs!(...args);
                    nested.push(encoder.encode('<nested/>'));
                },
            });
            parser.push(encoder.encode('<doc/>'));
            parser.finish();
            nested.finish();
            expect(outer).to.deep.equal([
                ['startDocument'],
                ['startElementNs', 'doc', null, null, [], []],
                ['endElementNs', 'doc', null, null],
                ['endDocument'],
            ]);
            expect(inner).to.deep.equal([
                ['startDocument'],
                ['startElementNs', 'nested', null, null, [], []],
                ['endElementNs', 'nested', null, null],
                ['endDocument'],
            ]);
        });

        it('accepts the parser again once the callback has returned', () => {
            const names: string[] = [];
            using parser = XmlSaxParser.create({
                startElementNs: (localName) => {
                    names.push(localName);
                    expect(() => parser.push(encoder.encode('x'))).to.throw(
                        XmlError,
                        'The parser cannot be re-entered from a handler callback',
                    );
                },
            });
            parser.push(encoder.encode('<doc>'));
            parser.push(encoder.encode('<child/></doc>'));
            parser.finish();
            expect(names).to.deep.equal(['doc', 'child']);
        });
    });

    describe('garbage collection', () => {
        it('collects a parser whose handler refers back to it', async () => {
            // the documented way to call stop() makes the handler reference its
            // own parser; that must not keep the parser from being collected
            diag.configure({ enabled: true });
            try {
                {
                    const parser: XmlSaxParser = XmlSaxParser.create({
                        startElementNs: () => parser.stop(),
                    });
                    parser.push(encoder.encode('<doc><child/></doc>'));
                }
                expect(diag.report().XmlSaxParser.totalInstances).to.equal(1);

                for (let i = 0; i < 3; i += 1) { // try 3 times
                    (global as any).gc();
                    // allow the finalizer to run
                    // eslint-disable-next-line no-await-in-loop
                    await new Promise((resolve) => {
                        setTimeout(resolve, 0);
                    });
                }

                expect(diag.report().XmlSaxParser.garbageCollected).to.equal(1);
            } finally {
                diag.configure({ enabled: false });
            }
        });
    });

    describe('handler exceptions', () => {
        it('rethrows the exception from push and aborts parsing', () => {
            const failure = new Error('boom');
            const names: string[] = [];
            using parser = XmlSaxParser.create({
                startElementNs: (localName) => {
                    names.push(localName);
                    if (localName === 'b') {
                        throw failure;
                    }
                },
            });
            expect(() => parser.push(encoder.encode('<doc><a/><b/><c/></doc>')))
                .to.throw(failure);
            expect(names).to.deep.equal(['doc', 'a', 'b']);
            expect(() => parser.push(encoder.encode('x'))).to.throw(
                XmlError,
                'Parsing is already terminated',
            );
        });

        it('rethrows the exception from finish', () => {
            const failure = new Error('boom');
            using parser = XmlSaxParser.create({
                endDocument: () => {
                    throw failure;
                },
            });
            parser.push(encoder.encode('<doc/>'));
            expect(() => parser.finish()).to.throw(failure);
        });
    });

    describe('instance isolation', () => {
        it('keeps interleaved parsers independent', () => {
            const first: SaxEvent[] = [];
            const second: SaxEvent[] = [];
            using parser1 = XmlSaxParser.create(recordingHandler(first));
            using parser2 = XmlSaxParser.create(recordingHandler(second));
            parser1.push(encoder.encode('<one><a>'));
            parser2.push(encoder.encode('<two>'));
            parser1.push(encoder.encode('1</a>'));
            parser2.push(encoder.encode('2</two>'));
            parser2.finish();
            parser1.push(encoder.encode('</one>'));
            parser1.finish();
            expect(first).to.deep.equal([
                ['startDocument'],
                ['startElementNs', 'one', null, null, [], []],
                ['startElementNs', 'a', null, null, [], []],
                ['characters', '1'],
                ['endElementNs', 'a', null, null],
                ['endElementNs', 'one', null, null],
                ['endDocument'],
            ]);
            expect(second).to.deep.equal([
                ['startDocument'],
                ['startElementNs', 'two', null, null, [], []],
                ['characters', '2'],
                ['endElementNs', 'two', null, null],
                ['endDocument'],
            ]);
        });
    });

    describe('disposal', () => {
        it('is idempotent', () => {
            const parser = XmlSaxParser.create({});
            parser.dispose();
            parser.dispose();
        });

        it('rejects input after dispose', () => {
            const parser = XmlSaxParser.create({});
            parser.dispose();
            expect(() => parser.push(encoder.encode('<doc/>'))).to.throw(
                XmlError,
                'The parser is disposed',
            );
            expect(() => parser.finish()).to.throw(XmlError, 'The parser is disposed');
            // the diagnostics are released with the parser, rather than
            // silently reported as none
            expect(() => parser.warnings).to.throw(XmlError, 'The parser is disposed');
            expect(() => parser.errors).to.throw(XmlError, 'The parser is disposed');
        });

        it('supports using declarations', () => {
            let leaked: XmlSaxParser;
            {
                using parser = XmlSaxParser.create({});
                parser.push(encoder.encode('<doc/>'));
                parser.finish();
                leaked = parser;
            }
            expect(() => leaked.push(encoder.encode('x'))).to.throw(
                XmlError,
                'The parser is disposed',
            );
        });
    });
});
