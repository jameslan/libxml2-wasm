import { assert, expect } from 'chai';
import {
    XmlDocument, diag,
} from '@libxml2-wasm/lib/index.mjs';
import {
    XmlC14NMode,
} from '@libxml2-wasm/lib/c14n.mjs';

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
                const canonical = doc.toCanonicalString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal(xmlString);
            });
        });

        it('should order attributes', () => {
            const xmlString = '<root><child attr2="value2" attr1="value1">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.toCanonicalString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root><child attr1="value1" attr2="value2">text</child></root>');
            });
            expect(diag.report()).to.deep.equal({});
        });

        it('should sort namespace declarations', () => {
            const xmlString = '<root xmlns:ns2="uri:ns2" xmlns:ns1="uri:ns1" ns2:attr="value"><ns1:child>text</ns1:child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.toCanonicalString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root xmlns:ns1="uri:ns1" xmlns:ns2="uri:ns2" ns2:attr="value"><ns1:child>text</ns1:child></root>');
            });
            expect(diag.report()).to.deep.equal({});
        });

        it('should remove whitespace between attributes', () => {
            const xmlString = '<root><child attr1="value1"  attr2="value2">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.toCanonicalString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root><child attr1="value1" attr2="value2">text</child></root>');
            });
            expect(diag.report()).to.deep.equal({});
        });

        it('should replace self-closing tags with full tags', () => {
            const xmlString = '<root><child attr="value"/></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.toCanonicalString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root><child attr="value"></child></root>');

                doc.dispose();
            });
            expect(diag.report()).to.deep.equal({});
        });

        it('should remove the XML declaration', () => {
            const xmlString = '<?xml version="1.0" encoding="UTF-8"?><root><child>text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.toCanonicalString({
                    mode: XmlC14NMode.XML_C14N_1_0,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<root><child>text</child></root>');
            });
            expect(diag.report()).to.deep.equal({});
        });
    });

    describe('canonicalizeNode', () => {
        it('should canonicalize only a specific subtree', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1" xmlns:ns2="uri:notused"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child><sibling>other</sibling></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const node = doc.get('//ns1:child', { ns1: 'uri:ns1' });

                expect(node).to.not.be.null;
                assert(node != null);

                const canonical = doc.toCanonicalString({
                    mode: XmlC14NMode.XML_C14N_1_0, node,
                });

                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<ns1:child xmlns="uri:root" xmlns:ns1="uri:ns1" attr="value"><childofchild attr="val">text</childofchild></ns1:child>');
            });
            expect(diag.report()).to.deep.equal({});
        });

        it('should include inclusive namespaces with exclusive canonicalization', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1" xmlns:ns2="uri:notused" xmlns:ns3="uri:alsonotused"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child><sibling>other</sibling></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const inclusiveNamespaces = ['ns3'];
                const node = doc.get('//ns1:child', { ns1: 'uri:ns1' });
                expect(node).to.not.be.null;
                assert(node != null);

                const canonical = doc.toCanonicalString({
                    node,
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                    inclusiveNamespacePrefixList: inclusiveNamespaces,
                });
                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<ns1:child xmlns:ns1="uri:ns1" xmlns:ns3="uri:alsonotused" attr="value"><childofchild xmlns="uri:root" attr="val">text</childofchild></ns1:child>');
            });
            expect(diag.report()).to.deep.equal({});
        });
    });

    describe('canonicalizeNodeSet', () => {
        it('should work with nodeset', () => {
            const xmlString = '<root xmlns="uri:root" xmlns:ns1="uri:ns1" xmlns:ns2="uri:notused"><ns1:child attr="value"><childofchild attr="val">text</childofchild></ns1:child><sibling>other</sibling></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const nodes = doc.find('//ns1:child/namespace::* | //ns:sibling/namespace::*', { ns: 'uri:root', ns1: 'uri:ns1' });

                expect(nodes).to.have.lengthOf(4);

                const canonical = doc.toCanonicalString(
                    { mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0, nodeSet: nodes },
                );

                expect(canonical).to.be.a('string');
                expect(canonical).to.equal('<ns1:child xmlns="uri:root" xmlns:ns1="uri:ns1" attr="value"></ns1:child><sibling>other</sibling>');
            });
            expect(diag.report()).to.deep.equal({});
        });
    });

    describe('canonicalizeCallback', () => {
        it('should work with isVisibleCallback', () => {
            const xmlString = '<root><child attr="value">text</child></root>';
            usingXmlDocument(XmlDocument.fromString(xmlString), (doc) => {
                const canonical = doc.toCanonicalString({
                    mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
                    isVisibleCallback: () => true,
                });
                expect(canonical).to.equal('<root><child attr="value">text</child></root>');
            });
        });
    });
});
