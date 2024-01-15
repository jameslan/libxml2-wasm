import { expect } from 'chai';
import { XmlDocument, XmlXPath } from '@libxml2-wasm/lib/index.mjs';

describe('XPath', () => {
    const doc1 = XmlDocument.fromString('<book><title>Harry Potter</title></book>');
    const doc2 = XmlDocument.fromString('<book><title>Learning XML</title></book>');

    it('could be used in get method of multiple docs', () => {
        const xpath = new XmlXPath('/book/title');
        expect(doc1.get(xpath)?.content).to.equal('Harry Potter');
        expect(doc2.get(xpath)?.content).to.equal('Learning XML');
        xpath.dispose();
    });

    it('could be used in find method of multiple docs', () => {
        const xpath = new XmlXPath('/book/title');
        expect(doc1.find(xpath).map((node) => node.content)).to.deep.equal(['Harry Potter']);
        expect(doc2.find(xpath).map((node) => node.content)).to.deep.equal(['Learning XML']);
        xpath.dispose();
    });

    it('should handle null xpath string', () => {
        const xpath = new XmlXPath(null!);
        xpath.dispose();
    });

    it('handles namespace', () => {
        const doc = XmlDocument.fromString(
            '<book xmlns:t="http://foo"><t:title>Harry Potter</t:title></book>',
        );
        const xpath = new XmlXPath('/book/m:title', { m: 'http://foo' });
        expect(doc.get(xpath)?.content).to.equal('Harry Potter');
        expect(doc.find(xpath).map((node) => node.content)).to.deep.equal(['Harry Potter']);
        xpath.dispose();
    });

    it('should return undefined if namespace is not provided', () => {
        const xpath = new XmlXPath(('/book'));
        expect(xpath.namespaces).to.be.undefined;
        xpath.dispose();
    });

    it('should return namespaces passed in', () => {
        const xpath = new XmlXPath('/book/m:title', { m: 'http://foo' });
        expect(xpath.namespaces).to.deep.equal({ m: 'http://foo' });
        xpath.dispose();
    });

    it('should return xpath string by toString', () => {
        const xpath = new XmlXPath(('/book'));
        expect(xpath.toString()).to.equal('/book');
        xpath.dispose();
    });
});
