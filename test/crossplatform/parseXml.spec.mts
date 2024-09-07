import { expect } from 'chai';
import {
    ParseOption,
    XmlCData,
    xmlCleanupInputProvider,
    XmlDocument,
    XmlParseError,
    xmlRegisterInputProvider,
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

describe('XInclude', () => {
    after(() => {
        xmlCleanupInputProvider();
    });

    const registerCallbacks = (xmlPath: string, xml: string) => {
        let finished = 0;
        xmlRegisterInputProvider({
            match(filename: string): boolean {
                return filename === xmlPath;
            },

            open(filename: string): number | undefined {
                if (filename !== xmlPath) return undefined;
                return 10;
            },

            read(fd: number, buf: Uint8Array): number {
                if (finished === fd) return 0;
                // didn't handle the case of reading multiple times to finish
                // normally the buffer is bigger than our short xml
                const { read } = new TextEncoder().encodeInto(xml, buf);
                finished = fd;
                return read;
            },

            close(): boolean {
                return true;
            },
        });
    };

    it('should process xml with XInclude', () => {
        registerCallbacks('path/sub.xml', '<sub foo="bar"></sub>');
        using doc = XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml"></xi:include></doc>',
            { url: 'path/doc.xml' },
        );

        expect(doc.get('/doc/sub/@foo')?.content).to.equal('bar');
    });

    it('should handle errors in the included XML', () => {
        registerCallbacks('path/sub.xml', '<sub foo="bar">');
        expect(() => XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml"></xi:include></doc>',
            { url: 'path/doc.xml' },
        )).to.throw(
            XmlParseError,
            'Premature end of data in tag sub line 1\ncould not load path/sub.xml, and no fallback was found',
        ).with.deep.property('details', [{
            message: 'Premature end of data in tag sub line 1\n',
            file: 'path/sub.xml',
            line: 1,
            col: 16,
        }, {
            message: 'could not load path/sub.xml, and no fallback was found\n',
            file: 'path/doc.xml',
            line: 1,
            col: 0,
        }]);
    });
});
