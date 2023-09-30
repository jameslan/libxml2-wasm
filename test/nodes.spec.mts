import { expect } from 'chai';
import { parseXmlString } from '../lib/index.mjs';
import { XmlAttribute, XmlElement } from '../lib/nodes.mjs';

const doc = parseXmlString(`<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
    <book>
        <title lang="en">Harry Potter</title>
        <price>29.99</price>
    </book>

    <book>
        <title lang="en">Learning XML</title>
        <price>39.95</price>
    </book>
</bookstore>`);

describe('XmlNode', () => {
    describe('get', () => {
        it('should query the first element', () => {
            const book = doc.get('book');
            expect(book).to.be.an.instanceOf(XmlElement);
            expect(book!.name).to.equal('book');
        });

        it('should return null if not found', () => {
            expect(doc.get('bookstore')).to.be.null;
        });
    });
});

describe('XmlAttribute', () => {
    describe('name value getter', () => {
        it('should return name and value', () => {
            const attr = doc.get('/bookstore/book/title/@lang');
            expect(attr).to.be.an.instanceOf(XmlAttribute);
            expect(attr!.name).to.equal('lang');
            expect((attr as XmlAttribute).value).to.equal('en');
        });
    });
});
