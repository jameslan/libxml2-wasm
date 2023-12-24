import { expect } from 'chai';
import { parseXmlString } from '../lib/index.mjs';
import { XmlXPath } from '../lib/xpath.mjs';

describe('XPath', () => {
    const doc1 = parseXmlString('<book><title>Harry Potter</title></book>');
    const doc2 = parseXmlString('<book><title>Learning XML</title></book>');

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
        const doc = parseXmlString(
            '<book xmlns:t="http://foo"><t:title>Harry Potter</t:title></book>',
        );
        const xpath = new XmlXPath('/book/m:title', { m: 'http://foo' });
        expect(doc.get(xpath)?.content).to.equal('Harry Potter');
        expect(doc.find(xpath).map((node) => node.content)).to.deep.equal(['Harry Potter']);
    });
});
