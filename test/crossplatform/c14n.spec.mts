import { assert, expect } from 'chai';
import {
    XmlDocument, diag, XmlC14NMode, XmlStringOutputBufferHandler,
} from '@libxml2-wasm/lib/index.mjs';
import { XmlTreeCommonStruct } from '@libxml2-wasm/lib/libxml2.mjs';

const usingXmlDocument = (doc: XmlDocument, cb: (doc: XmlDocument) => void) => {
    diag.configure({ enabled: true });
    try {
        cb(doc);
    } finally {
        doc.dispose();
        const report = diag.report();
        diag.configure({ enabled: false });
        expect(report).to.deep.equal({});
    }
};

describe('C14N (XML Canonicalization)', () => {
    describe('canonicalizeDocument', () => {
        it('should canonicalize a simple XML document', () => {
            const xmlString = '<root><child attr="value">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal(xmlString);
            });
        });

        it('should order attributes', () => {
            const xmlString = '<root><child attr2="value2" attr1="value1">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root><child attr1="value1" attr2="value2">text</child></root>');
            });
        });

        it('should sort namespace declarations', () => {
            const xmlString = '<root xmlns:ns2="uri:ns2" xmlns:ns1="uri:ns1" ns2:attr="value"><ns1:child>text</ns1:child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root xmlns:ns1="uri:ns1" xmlns:ns2="uri:ns2" ns2:attr="value"><ns1:child>text</ns1:child></root>');
            });
        });

        it('should remove whitespace between attributes', () => {
            const xmlString = '<root><child attr1="value1"  attr2="value2">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root><child attr1="value1" attr2="value2">text</child></root>');
            });
        });

        it('should replace self-closing tags with full tags', () => {
            const xmlString = '<root><child attr="value"/></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root><child attr="value"></child></root>');
            });
        });

        it('should remove the XML declaration', () => {
            const xmlString = '<?xml version="1.0" encoding="UTF-8"?><root><child>text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root><child>text</child></root>');
            });
        });
    });

    describe('doc.canonicalize(handler, options)', () => {
        it('should canonicalize document using handler API', () => {
            const xmlString = '<root><child attr="value">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const handler = new XmlStringOutputBufferHandler();
                doc.canonicalize(handler);
                expect(handler.result).to.equal(xmlString);
            });
        });
    });

    describe('canonicalizeSubtree', () => {
        it('should canonicalize only a specific subtree', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1" xmlns:ns2="uri:notused"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child><sibling>other</sibling></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const node = doc.get('//ns1:child', { ns1: 'uri:ns1' });

                expect(node).to.not.be.null;
                assert(node != null);

                const canonical = node.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                });

                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<ns1:child xmlns:ns1="uri:ns1" attr="value"><childofchild xmlns="uri:root" attr="val">text</childofchild></ns1:child>');
            });
        });

        it('should include inclusive namespaces with exclusive canonicalization', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1" xmlns:ns2="uri:notused" xmlns:ns3="uri:alsonotused"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child><sibling>other</sibling></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const inclusiveNamespaces = ['ns3'];
                const node = doc.get('//ns1:child', { ns1: 'uri:ns1' });
                expect(node).to.not.be.null;
                assert(node != null);

                const canonical = node.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                    inclusiveNamespacePrefixes: inclusiveNamespaces,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<ns1:child xmlns:ns1="uri:ns1" xmlns:ns3="uri:alsonotused" attr="value"><childofchild xmlns="uri:root" attr="val">text</childofchild></ns1:child>');
            });
        });
    });

    describe('canonicalizeNodeSet', () => {
        it('should work with nodeset', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1" xmlns:ns2="uri:notused"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child><sibling>other</sibling></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const nodes = doc.find('//ns1:child | //ns:sibling', { ns: 'uri:root', ns1: 'uri:ns1' });

                expect(nodes).to.have.lengthOf(2);

                const nodeSet = new Set(nodes);
                const canonical = doc.canonicalizeToString(
                    { mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0, nodeSet },
                );

                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<ns1:child xmlns:ns1="uri:ns1" attr="value"><childofchild xmlns="uri:root" attr="val">text</childofchild></ns1:child><sibling xmlns="uri:root">other</sibling>');
            });
        });
    });

    describe('canonicalizeCallback', () => {
        it('should work with isVisible callback', () => {
            const xmlString = '<root><child attr="value">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                    isVisible: () => true,
                });
                expect(canonical).to.equal('<root><child attr="value">text</child></root>');
            });
        });

        it('should filter nodes with custom isVisible callback', () => {
            const xmlString = '<root><keep>preserved</keep><remove>filtered</remove></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                    isVisible: (nodePtr: number) => {
                        // Filter out elements named 'remove'
                        const type = XmlTreeCommonStruct.type(nodePtr);
                        // Only check name for element nodes (type 1)
                        if (type === 1) {
                            const name = XmlTreeCommonStruct.name_(nodePtr);
                            return name !== 'remove';
                        }
                        return true; // Include all other node types
                    },
                });
                expect(canonical).to.equal('<root><keep>preserved</keep></root>');
            });
        });

        it('should throw error when both isVisible and nodeSet are provided', () => {
            const xmlString = '<root><child>text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const nodes = doc.find('//child');
                const nodeSet = new Set(nodes);
                expect(() => doc.canonicalizeToString({
                    isVisible: () => true,
                    nodeSet,
                } as any)).to.throw('Cannot specify both isVisible and nodeSet');
            });
        });
    });

    describe('canonicalization with comments', () => {
        it('should exclude comments by default', () => {
            const xmlString = '<root><!-- comment --><child>text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({ mode: XmlC14NMode.XML_C14N_1_0 });
                expect(canonical).to.equal('<root><child>text</child></root>');
            });
        });

        it('should include comments when withComments is true', () => {
            const xmlString = '<root><!-- comment --><child>text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                    withComments: true,
                });
                expect(canonical).to.equal('<root><!-- comment --><child>text</child></root>');
            });
        });
    });

    describe('all C14N modes', () => {
        const xmlString = '<root xmlns="uri:default" xmlns:ns1="uri:ns1"><ns1:child attr="value">text</ns1:child></root>';

        it('should canonicalize with XML_C14N_1_0', () => {
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({ mode: XmlC14NMode.XML_C14N_1_0 });
                expect(canonical).to.be.a('string');
                expect(canonical).to.include('xmlns');
            });
        });

        it('should canonicalize with XML_C14N_EXCLUSIVE_1_0', () => {
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.include('xmlns');
            });
        });

        it('should canonicalize with XML_C14N_1_1', () => {
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.canonicalizeToString({ mode: XmlC14NMode.XML_C14N_1_1 });
                expect(canonical).to.be.a('string');
                expect(canonical).to.include('xmlns');
            });
        });
    });

    describe('node.toCanonicalString() / node.canonicalize()', () => {
        it('should canonicalize a node subtree', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child><sibling>other</sibling></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const node = doc.get('//ns1:child', { ns1: 'uri:ns1' });
                expect(node).to.not.be.null;
                assert(node != null);

                const canonical = node.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                });

                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<ns1:child xmlns:ns1="uri:ns1" attr="value"><childofchild xmlns="uri:root" attr="val">text</childofchild></ns1:child>');
            });
        });

        it('should work with default options', () => {
            const xmlString = '<root><child attr="value">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const node = doc.get('//child');
                expect(node).to.not.be.null;
                assert(node != null);

                const canonical = node.canonicalizeToString();

                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<child attr="value">text</child>');
            });
        });

        it('should support inclusive namespaces', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1" xmlns:ns2="uri:notused" xmlns:ns3="uri:alsonotused"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const node = doc.get('//ns1:child', { ns1: 'uri:ns1' });
                expect(node).to.not.be.null;
                assert(node != null);

                const canonical = node.canonicalizeToString({
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                    inclusiveNamespacePrefixes: ['ns3'],
                });

                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<ns1:child xmlns:ns1="uri:ns1" xmlns:ns3="uri:alsonotused" attr="value"><childofchild xmlns="uri:root" attr="val">text</childofchild></ns1:child>');
            });
        });

        it('should include comments when requested', () => {
            const xmlString = '<root><child><!-- comment -->text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const node = doc.get('//child');
                expect(node).to.not.be.null;
                assert(node != null);

                const canonical = node.canonicalizeToString({ withComments: true });

                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<child><!-- comment -->text</child>');
            });
        });

        it('should support canonicalize(handler, options) API', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child><sibling>other</sibling></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const node = doc.get('//ns1:child', { ns1: 'uri:ns1' });
                expect(node).to.not.be.null;
                assert(node != null);

                const handler = new XmlStringOutputBufferHandler();
                node.canonicalize(handler, {
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                });

                expect(handler.result).to.be.a('string');
                expect(handler.result).to.equal('<ns1:child xmlns:ns1="uri:ns1" attr="value"><childofchild xmlns="uri:root" attr="val">text</childofchild></ns1:child>');
            });
        });
    });
});
