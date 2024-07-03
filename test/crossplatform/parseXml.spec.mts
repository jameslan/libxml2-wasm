import { expect } from 'chai';
import {
    ParseOption,
    XmlCData,
    XmlDocument,
    XmlParseError,
} from '@libxml2-wasm/lib/index.mjs';

describe('parseXmlString', () => {
    it('should parse valid xml string', () => {
        const doc = XmlDocument.fromString('<doc/>');

        expect(doc.root.name).equals('doc');

        doc.dispose();
    });

    it('should throw exception on invalid xml string', () => {
        expect(() => XmlDocument.fromString('<doc>')).to.throw(
            XmlParseError,
            'Premature end of data in tag doc line 1\n',
        ).with.deep.property('details', [{
            message: 'Premature end of data in tag doc line 1\n',
            line: 1,
            col: 6,
        }]);
    });

    it('should throw exception with all errors on invalid xml', () => {
        expect(() => XmlDocument.fromString('<doc><b><book></b>\n<b><book></b></doc>')).to.throw(
            XmlParseError,
            'Opening and ending tag mismatch: book line 1 and b\n'
                + 'Opening and ending tag mismatch: book line 2 and b\n'
                + 'Opening and ending tag mismatch: b line 2 and doc\n',
        ).with.deep.property('details', [{
            message: 'Opening and ending tag mismatch: book line 1 and b\n',
            line: 1,
            col: 19,
        }, {
            message: 'Opening and ending tag mismatch: book line 2 and b\n',
            line: 2,
            col: 14,
        }, {
            message: 'Opening and ending tag mismatch: b line 2 and doc\n',
            line: 2,
            col: 20,
        }]);
    });

    it('should support parse option', () => {
        const doc = XmlDocument.fromString(
            '<doc><![CDATA[3>2]]></doc>',
            { option: ParseOption.XML_PARSE_NOCDATA },
        );
        expect(doc.root.firstChild).to.not.be.instanceOf(XmlCData);
        expect(doc.root.content).to.equal('3>2');
        doc.dispose();
    });
});

describe('parseXmlBuffer', () => {
    it('should parse valid xml buffer', () => {
        const doc = XmlDocument.fromBuffer(new TextEncoder().encode('<doc/>'));

        expect(doc.root.name).equals('doc');

        doc.dispose();
    });

    it('should throw exception on invalid xml buffer', () => {
        expect(() => XmlDocument.fromBuffer(new TextEncoder().encode('<doc>'))).to.throw(
            XmlParseError,
            'Premature end of data in tag doc line 1\n',
        ).with.deep.property('details', [{
            message: 'Premature end of data in tag doc line 1\n',
            line: 1,
            col: 6,
        }]);
    });

    it('should throw exception with all errors on invalid xml', () => {
        expect(() => XmlDocument.fromBuffer(
            new TextEncoder().encode('<doc><b><book></b>\n<b><book></b></doc>'),
        )).to.throw(
            XmlParseError,
            'Opening and ending tag mismatch: book line 1 and b\n'
            + 'Opening and ending tag mismatch: book line 2 and b\n'
            + 'Opening and ending tag mismatch: b line 2 and doc\n',
        ).with.deep.property('details', [{
            message: 'Opening and ending tag mismatch: book line 1 and b\n',
            line: 1,
            col: 19,
        }, {
            message: 'Opening and ending tag mismatch: book line 2 and b\n',
            line: 2,
            col: 14,
        }, {
            message: 'Opening and ending tag mismatch: b line 2 and doc\n',
            line: 2,
            col: 20,
        }]);
    });

    it('should throw if input buffer is null', () => {
        expect(() => XmlDocument.fromBuffer(null!)).to.throw(
            XmlParseError,
            '',
        );
    });

    it('should support parse option', () => {
        const doc = XmlDocument.fromBuffer(
            new TextEncoder().encode('<doc><![CDATA[3>2]]></doc>'),
            { option: ParseOption.XML_PARSE_NOCDATA },
        );
        expect(doc.root.firstChild).to.not.be.instanceOf(XmlCData);
        expect(doc.root.content).to.equal('3>2');
        doc.dispose();
    });
});
