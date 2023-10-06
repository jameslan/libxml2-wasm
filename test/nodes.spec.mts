import { expect } from 'chai';
import { parseXmlString } from '../lib/index.mjs';
import { XmlAttribute, XmlElement, XmlText } from '../lib/nodes.mjs';

const doc = parseXmlString(`<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
    <book>
        <title lang="en" author="J.K. Rowling">Harry Potter</title>
        <price>29.99</price>
    </book>

    <book>
        <title lang="en" author="Erik Ray">Learning XML</title>
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

    describe('parent getter', () => {
        it('should return null on root', () => {
            expect(doc.root.parent).to.be.null;
        });

        it('should return parent element of an element', () => {
            const parent = doc.root.get('book')?.parent;
            expect(parent).to.be.instanceOf(XmlElement);
            expect((parent as XmlElement).name).to.equal('bookstore');
        });

        it('should return parent element of an attribute', () => {
            const parent = doc.root.get('book/title/@lang')?.parent;
            expect(parent).to.be.instanceOf(XmlElement);
            expect((parent as XmlElement).name).to.equal('title');
        });

        it('should return parent element of a text', () => {
            const parent = doc.root.get('book/title/text()')?.parent;
            expect(parent).to.be.instanceOf(XmlElement);
            expect((parent as XmlElement).name).to.equal('title');
        });
    });
});

describe('XmlElement', () => {
    describe('attrs getter', () => {
        it('should return all attributes', () => {
            const { attrs } = doc.get('book/title') as XmlElement;

            expect(attrs.length).to.equal(2);
            expect(attrs[0].name).to.equal('lang');
            expect(attrs[0].value).to.equal('en');
            expect(attrs[1].name).to.equal('author');
            expect(attrs[1].value).to.equal('J.K. Rowling');
        });
    });

    describe('attr', () => {
        it('should return null if not found', () => {
            expect((doc.get('book/title') as XmlElement).attr('language')).to.be.null;
        });

        it('should return the attribute', () => {
            const lang = (doc.get('book/title') as XmlElement).attr('lang');
            expect(lang).is.not.null;
            expect(lang!.name).to.equal('lang');
            expect(lang!.value).to.equal('en');
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

        it('should return text for XmlText', () => {
            expect(doc.get('book/title/text()')!.name).to.equal('text');
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
