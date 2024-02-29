import { expect } from 'chai';
import {
    XmlAttribute,
    XmlCData,
    XmlComment,
    XmlDocument,
    XmlElement,
    XmlText,
} from '@libxml2-wasm/lib/index.mjs';

const doc = XmlDocument.fromString(`<?xml version="1.0" encoding="UTF-8"?>
<bookstore xmlns:m="http://www.federalreserve.gov"><!--comment1-->
    <book><title lang="en" author="J.K. Rowling">Harry Potter</title><price m:currency="USD"><![CDATA[29.99]]></price></book>
    <book><title lang="en" author="Erik Ray">Learning XML</title><price m:currency="USD">39.95</price></book>
<!--comment2--></bookstore>`);

describe('XmlNode', () => {
    describe('get', () => {
        it('should query the first element', () => {
            const book = doc.root.get('book');
            expect(book).to.be.an.instanceOf(XmlElement);
            expect((book as XmlElement).name).to.equal('book');
        });

        it('should return null if not found', () => {
            expect(doc.get('bookstore')).to.be.null;
            expect(doc.get('/books/book/title[@author="Erik Ray"]')).to.be.null;
        });

        it('should return null for invalid xpath', () => {
            expect(doc.get('doc[@lang')).to.be.null;
        });

        it('should return null for null xpath(accidentally)', () => {
            expect(doc.get(null!)).to.be.null;
        });

        it('should be able to return XmlAttribute', () => {
            const attr = doc.root.get('book/title/@lang');
            expect(attr).to.be.instanceOf(XmlAttribute);
            expect((attr as XmlAttribute).name).to.equal('lang');
            expect(attr!.content).to.equal('en');
        });

        it('should be able to return XmlText', () => {
            const text = doc.get('/bookstore/book/title/text()');
            expect(text).to.be.instanceOf(XmlText);
            expect(text?.content).to.equal('Harry Potter');
        });

        it('should handle namespace in xpath', () => {
            const currency = doc.root.get(
                'book/price/@m:currency',
                { m: 'http://www.federalreserve.gov' },
            );
            expect(currency).to.not.be.null;
            expect(currency).to.be.instanceOf(XmlAttribute);
            expect((currency as XmlAttribute).name).to.equal('currency');
            expect((currency as XmlAttribute).content).to.equal('USD');
        });

        it('should handle namespace in xpath with different prefix', () => {
            const currency = doc.root.get(
                'book/price/@c:currency',
                { c: 'http://www.federalreserve.gov' },
            );
            expect(currency).to.not.be.null;
            expect(currency).to.be.instanceOf(XmlAttribute);
            expect((currency as XmlAttribute).name).to.equal('currency');
            expect((currency as XmlAttribute).content).to.equal('USD');
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

    describe('firstChild getter', () => {
        it('should return null for a leaf node', () => {
            const titleText = doc.get('book/title/text()');
            expect(titleText?.firstChild).to.be.null;
        });

        it('should return text if has not sub element', () => {
            const text = doc.get('book/title')?.firstChild;
            expect(text).to.be.instanceOf(XmlText);
            expect((text as XmlText).content).to.equal('Harry Potter');
        });

        it('should return first sub-element', () => {
            const title = doc.get('book')?.firstChild;
            expect(title).to.be.instanceOf(XmlElement);
            expect((title as XmlElement).name).to.equal('title');
        });

        it('should be able to return comment node', () => {
            const comment = doc.root.firstChild;
            expect(comment).to.be.instanceOf(XmlComment);
            expect(comment?.content).to.equal('comment1');
        });

        it('should be able to return cdata node', () => {
            const cdata = doc.get('book/price')?.firstChild;
            expect(cdata).to.be.instanceOf(XmlCData);
            expect(cdata?.content).to.equal('29.99');
        });
    });

    describe('lastChild getter', () => {
        it('should return null for a leaf node', () => {
            const titleText = doc.get('book/title/text()');
            expect(titleText?.lastChild).to.be.null;
        });

        it('should return text if has not sub element', () => {
            const text = doc.get('book/title')?.lastChild;
            expect(text).to.be.instanceOf(XmlText);
            expect((text as XmlText).content).to.equal('Harry Potter');
        });

        it('should return last sub-element', () => {
            const price = doc.get('book')?.lastChild;
            expect(price).to.be.instanceOf(XmlElement);
            expect((price as XmlElement).name).to.equal('price');
        });

        it('should be able to return comment node', () => {
            const comment = doc.root.lastChild;
            expect(comment).to.be.instanceOf(XmlComment);
        });
    });

    describe('next getter', () => {
        it('should return null for the last node', () => {
            const price = doc.get('book')?.lastChild;
            expect(price?.next).to.be.null;
        });

        it('should return next sibling element', () => {
            const price = doc.get('book/title')?.next;
            expect(price).to.be.instanceOf(XmlElement);
            expect((price as XmlElement).name).to.equal('price');
        });

        it('should return next attribute', () => {
            const author = doc.get('book/title/@lang')?.next;
            expect(author).to.be.instanceOf(XmlAttribute);
            expect((author as XmlAttribute).name).to.equal('author');
        });
    });

    describe('prev getter', () => {
        it('should return null for the first node', () => {
            const price = doc.get('book')?.firstChild;
            expect(price?.prev).to.be.null;
        });

        it('should return previous sibling element', () => {
            const title = doc.get('book/price')?.prev;
            expect(title).to.be.instanceOf(XmlElement);
            expect((title as XmlElement).name).to.equal('title');
        });

        it('should return previous attribute', () => {
            const lang = doc.get('book/title/@author')?.prev;
            expect(lang).to.be.instanceOf(XmlAttribute);
            expect((lang as XmlAttribute).name).to.equal('lang');
        });
    });

    describe('content getter', () => {
        it('should get the text of XmlText', () => {
            expect(doc.get('book/title/text()')?.content).to.equal('Harry Potter');
        });

        it('should return value of XmlAttribute', () => {
            const attr = doc.get('/bookstore/book/title/@lang');
            expect(attr).to.be.an.instanceOf(XmlAttribute);
            expect(attr?.content).to.equal('en');
        });

        it('should get the text of XmlElement', () => {
            const title = doc.get('book/title');
            expect(title).to.be.instanceOf(XmlElement);
            expect(title?.content).to.equal('Harry Potter');
        });
    });

    describe('name getter', () => {
        it('should return name of XmlAttribute', () => {
            const attr = doc.get('/bookstore/book/title/@lang');
            expect(attr).to.be.an.instanceOf(XmlAttribute);
            expect((attr as XmlAttribute).name).to.equal('lang');
        });

        it('should return name of the XmlElement', () => {
            expect((doc.get('book/title') as XmlElement).name).to.equal('title');
        });

        it('should return name without namespace', () => {
            expect((doc.get('book/price') as XmlElement).attrs[0].name).to.equal('currency');
        });
    });

    describe('line getter', () => {
        it('returns line number', () => {
            expect(doc.root.line).to.equal(2);
            expect(doc.get('book')?.line).to.equal(3);
        });
    });

    describe('namespaces getter', () => {
        it('should get namespaces inherited for the element', () => {
            expect(doc.get('book')?.namespaces).to.deep.equal({ m: 'http://www.federalreserve.gov' });
        });

        it('should return empty if element has no namespace definition', () => {
            const document = XmlDocument.fromString('<doc/>');
            expect(document.root.namespaces).to.be.empty;
            document.dispose();
        });

        it('should get namespaces on an attribute', () => {
            expect(doc.get('book/title/@lang')?.namespaces).to.deep.equal(
                { m: 'http://www.federalreserve.gov' },
            );
        });
    });

    describe('find', () => {
        it('return empty array if not found', () => {
            expect(doc.find('book[title/@lang="de"]')).to.be.empty;
        });

        it('should return [] for null xpath(accidentally)', () => {
            expect(doc.find(null!)).to.be.empty;
        });

        it('should return [] for invalid xpath', () => {
            expect(doc.find('doc[@lang')).to.be.empty;
        });

        it('should return multiple elements', () => {
            const nodes = doc.find('book/title');
            expect(nodes.map((node) => node.content)).to.deep.equal(['Harry Potter', 'Learning XML']);
        });

        it('should return multiple attributes', () => {
            const nodes = doc.find('book/title/@author');
            expect(nodes.map((node) => node.content)).to.deep.equal(['J.K. Rowling', 'Erik Ray']);
        });

        it('should handle namespace in xpath', () => {
            const currencies = doc.root.find(
                'book/price/@m:currency',
                { m: 'http://www.federalreserve.gov' },
            );
            expect(currencies.map((attr) => attr.content)).to.deep.equal(['USD', 'USD']);
        });

        it('should handle namespace in xpath with different prefix', () => {
            const currencies = doc.root.find(
                'book/price/@c:currency',
                { c: 'http://www.federalreserve.gov' },
            );
            expect(currencies.map((attr) => attr.content)).to.deep.equal(['USD', 'USD']);
        });
    });

    describe('namespaceForPrefix', () => {
        it('should return uri of a prefix', () => {
            expect(doc.root.namespaceForPrefix('m')).to.equal('http://www.federalreserve.gov');
            expect(doc.get('book')?.namespaceForPrefix('m')).to.equal(
                'http://www.federalreserve.gov',
            );
        });

        it('should return null if not found', () => {
            expect(doc.root.namespaceForPrefix('a')).is.null;
        });
    });

    describe('namespace getter', () => {
        it('should return the namespace of the node', () => {
            const attr = (doc.get('book/price') as XmlElement).attrs[0];
            expect(attr.name).to.equal('currency');
            expect(attr.namespacePrefix).to.equal('m');
            expect(attr.namespaceUri).to.equal('http://www.federalreserve.gov');
        });

        it('should return empty  if has no namespace', () => {
            expect(doc.root.namespacePrefix).to.equal('');
            expect(doc.root.namespaceUri).to.equal('');
        });
    });
});

describe('XmlElement', () => {
    describe('attrs getter', () => {
        it('should return all attributes', () => {
            const { attrs } = doc.get('book/title') as XmlElement;

            expect(attrs.length).to.equal(2);
            expect(attrs[0].name).to.equal('lang');
            expect(attrs[0].content).to.equal('en');
            expect(attrs[1].name).to.equal('author');
            expect(attrs[1].content).to.equal('J.K. Rowling');
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
            expect(lang!.content).to.equal('en');
        });

        it('should handle namespace', () => {
            const price = doc.get('book/price') as XmlElement;
            expect(price.attr('currency', 'm')?.content).to.equal('USD');
        });
    });

    describe('localNamespaces getter', () => {
        it('should get namespaces declared on the element', () => {
            expect(doc.root.localNamespaces).to.deep.equal({ m: 'http://www.federalreserve.gov' });
        });

        it('should return empty if element has no namespace definition', () => {
            expect((doc.get('book') as XmlElement).localNamespaces).to.be.empty;
        });
    });
});
