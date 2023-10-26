import { expect } from 'chai';
import {
    ParseOption,
    parseXmlBuffer,
    parseXmlString,
    XmlCData,
    XmlParseError,
} from '../lib/index.mjs';

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

    it('should support parse option', () => {
        const doc = parseXmlString(
            '<doc><![CDATA[3>2]]></doc>',
            { option: ParseOption.XML_PARSE_NOCDATA },
        );
        expect(doc.root.firstChild).to.not.be.instanceOf(XmlCData);
        expect(doc.root.content).to.equal('3>2');
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

    it('should support parse option', () => {
        const doc = parseXmlBuffer(
            new TextEncoder().encode('<doc><![CDATA[3>2]]></doc>'),
            { option: ParseOption.XML_PARSE_NOCDATA },
        );
        expect(doc.root.firstChild).to.not.be.instanceOf(XmlCData);
        expect(doc.root.content).to.equal('3>2');
    });
});
