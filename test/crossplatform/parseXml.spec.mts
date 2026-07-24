import { expect } from 'chai';

import {
    diag,
    ParseOption,
    XmlCData,
    xmlCleanupInputProvider,
    XmlDocument,
    XmlError,
    XmlParseError,
    xmlRegisterInputProvider,
} from '@libxml2-wasm/lib/index.mjs';

import type { XmlElement } from '@libxml2-wasm/lib/index.mjs';

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
            level: 3,
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
            level: 3,
            line: 1,
            col: 19,
        }, {
            message: 'Opening and ending tag mismatch: book line 2 and b\n',
            level: 3,
            line: 2,
            col: 14,
        }, {
            message: 'Opening and ending tag mismatch: b line 2 and doc\n',
            level: 3,
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

    it('allows utf8 only', () => {
        expect(() => XmlDocument.fromString('<doc/>', { encoding: 'iso8859-1' })).to.throw(
            XmlError,
            'Non-UTF-8 encoding is not supported for string input, use fromBuffer instead',
        );
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
            level: 3,
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
            level: 3,
            line: 1,
            col: 19,
        }, {
            message: 'Opening and ending tag mismatch: book line 2 and b\n',
            level: 3,
            line: 2,
            col: 14,
        }, {
            message: 'Opening and ending tag mismatch: b line 2 and doc\n',
            level: 3,
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
        using doc = XmlDocument.fromBuffer(
            new TextEncoder().encode('<doc><![CDATA[3>2]]></doc>'),
            { option: ParseOption.XML_PARSE_NOCDATA },
        );
        expect(doc.root.firstChild).to.not.be.instanceOf(XmlCData);
        expect(doc.root.content).to.equal('3>2');
    });
});

describe('parse warnings (non-fatal diagnostics)', () => {
    // Input is well-formed; XML_PARSE_PEDANTIC makes libxml2 emit WARNING-level
    // diagnostics ("URI is not absolute") while still returning a valid document.
    const warningXml = '<a xmlns:p="u" xmlns:q="u"/>';
    const pedantic = { option: ParseOption.XML_PARSE_PEDANTIC };

    it('should not reject a valid document that only produces warnings (string)', () => {
        using doc = XmlDocument.fromString(warningXml, pedantic);
        expect(doc.root.name).to.equal('a');
    });

    it('should not reject a valid document that only produces warnings (buffer)', () => {
        using doc = XmlDocument.fromBuffer(new TextEncoder().encode(warningXml), pedantic);
        expect(doc.root.name).to.equal('a');
    });

    it('should surface the warnings that were produced on the parsed document', () => {
        using doc = XmlDocument.fromString(warningXml, pedantic);
        // The parse must actually have emitted warnings (not merely "not thrown"):
        // two WARNING-level (1) "URI is not absolute" diagnostics, one per namespace.
        expect(doc.warnings).to.deep.equal([{
            message: 'xmlns:p: URI u is not absolute\n',
            level: 1,
            line: 1,
            col: 15,
        }, {
            message: 'xmlns:q: URI u is not absolute\n',
            level: 1,
            line: 1,
            col: 27,
        }]);
    });

    it('should expose no warnings for a clean parse', () => {
        using doc = XmlDocument.fromString('<doc/>');
        expect(doc.warnings).to.deep.equal([]);
    });

    it('should still reject a well-formed but invalid document (validity error)', () => {
        // Well-formed, so libxml2 returns a non-null doc; XML_PARSE_DTDVALID makes
        // the content model violation an ERROR-level (2) diagnostic, which must throw.
        expect(() => XmlDocument.fromString(
            '<!DOCTYPE a [<!ELEMENT a EMPTY>]><a><b/></a>',
            { option: ParseOption.XML_PARSE_DTDVALID },
        )).to.throw(XmlParseError);
    });

    it('should track and free the document produced alongside warnings', async () => {
        diag.configure({ enabled: true });
        try {
            const doc = XmlDocument.fromString(warningXml, pedantic);
            const tracked = diag.report();
            expect(tracked.XmlDocument.totalInstances).to.equal(1);
            expect(tracked.XmlDocument.garbageCollected).to.equal(0);
            expect(tracked.XmlDocument.instances[0].instance).to.equal(doc);

            doc.dispose();
            // allow the finalizer to run; a properly disposed doc must not resurface
            await new Promise((resolve) => {
                setTimeout(resolve, 0);
            });
            (global as any).gc();
            // dispose untracks the wrapper, so the class entry is gone entirely —
            // proving the native document was owned and freed, not leaked.
            const after = diag.report();
            expect(after.XmlDocument).to.be.undefined;
        } finally {
            diag.configure({ enabled: false });
        }
    });
});

describe('XInclude', () => {
    afterEach(() => {
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

    it('wont process xml with XInclude by default', () => {
        using doc = XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml">'
            + '</xi:include></doc>',
            { url: 'path/doc.xml' },
        );

        const inc = doc.root.firstChild as XmlElement;
        expect(inc.name).to.equal('include');
        expect(inc.prefix).to.equal('xi');
        expect(inc.attr('href')?.content).to.equal('sub.xml');
    });

    it('wont process xml with XInclude even with XML_PARSE_XINCLUDE flag', () => {
        registerCallbacks('path/sub.xml', '<sub foo="bar"></sub>');
        using doc = XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml">'
            + '</xi:include></doc>',
            { url: 'path/doc.xml', option: ParseOption.XML_PARSE_XINCLUDE },
        );

        const inc = doc.root.firstChild as XmlElement;
        expect(inc.name).to.equal('include');
        expect(inc.prefix).to.equal('xi');
        expect(inc.attr('href')?.content).to.equal('sub.xml');
    });
});
