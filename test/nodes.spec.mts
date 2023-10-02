import { expect } from 'chai';
import { parseXmlString } from '../lib/index.mjs';
import { XmlAttribute, XmlElement, XmlText } from '../lib/nodes.mjs';

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
            const book = doc.root.get('book');
            expect(book).to.be.an.instanceOf(XmlElement);
            expect(book!.name).to.equal('book');
        });

        it('should return null if not found', () => {
            expect(doc.get('bookstore')).to.be.null;
        });

        it('should be able to return XmlAttribute', () => {
            const attr = doc.root.get('book/title/@lang');
            expect(attr).to.be.instanceOf(XmlAttribute);
            expect(attr!.name).to.equal('lang');
            expect((attr as XmlAttribute).value).to.equal('en');
        });

        it('should be able to return XmlText', () => {
            const text = doc.get('/bookstore/book/title/text()');
            expect(text).to.be.instanceOf(XmlText);
        });
    });

    describe('doc property', () => {
        it('should return its document', () => {
            expect(doc.get('book')?.doc).to.equal(doc);
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

describe('XmlText', () => {
    describe('content getter', () => {
        it('should get the text of XmlText', () => {
            expect((doc.get('book/title/text()') as XmlText).content).to.equal('Harry Potter');
        });
    });
});
