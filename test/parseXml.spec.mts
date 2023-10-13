import { expect } from 'chai';
import { parseXmlString, parseXmlBuffer } from '../lib/index.mjs';
import { XmlParseError } from '../lib/libxml2.mjs';

describe('parseXmlString', () => {
    it('should parse valid xml string', () => {
        const doc = parseXmlString('<doc/>');

        expect(doc.root.name).equals('doc');

        doc.dispose();
    });

    it('should throw exception on invalid xml string', () => {
        expect(() => parseXmlString('<doc>')).to.throw(
            XmlParseError,
            'Premature end of data in tag doc line 1\n',
        );
    });
});

describe('parseXmlBuffer', () => {
    it('should parse valid xml buffer', () => {
        const doc = parseXmlBuffer(new TextEncoder().encode('<doc/>'));

        expect(doc.root.name).equals('doc');

        doc.dispose();
    });

    it('should throw exception on invalid xml buffer', () => {
        expect(() => parseXmlBuffer(new TextEncoder().encode('<doc>'))).to.throw(
            XmlParseError,
            'Premature end of data in tag doc line 1\n',
        );
    });

    it('should throw if input buffer is null', () => {
        expect(() => parseXmlBuffer(null!)).to.throw(
            XmlParseError,
            '',
        );
    });
});
