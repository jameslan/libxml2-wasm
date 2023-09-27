import { expect } from "chai";
import { parseXmlString } from "../lib/index.mjs";
import { XmlElement } from "../lib/nodes.mjs";

describe('XmlNode', () => {
    describe('get', () => {
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

        it('should query the first element', () => {
            const book = doc.get('book');
            expect(book).to.be.an.instanceOf(XmlElement);
            expect((book as XmlElement).name).to.equal('book');
        });
    });
});
