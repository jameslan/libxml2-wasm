import { expect } from 'chai';
import {
    closeBuffer,
    openBuffer,
    ParseOption,
    readBuffer,
    XmlBufferInputProvider,
    xmlCleanupInputProvider,
    XmlDocument,
    xmlRegisterInputProvider,
} from '@libxml2-wasm/lib/index.mjs';
import { XmlStringOutputBufferHandler } from '@libxml2-wasm/lib/utils.mjs';

describe('buffer reader', () => {
    afterEach(() => {
        xmlCleanupInputProvider();
    });

    it('uses buffer as input source', () => {
        const src = new TextEncoder().encode('<doc/>');
        const buffer = new Uint8Array(4);

        const reader = openBuffer(src);

        let bytes = readBuffer(reader, buffer);
        expect(bytes).to.equal(4);
        expect(buffer).to.deep.equal(new Uint8Array([0x3c, 0x64, 0x6f, 0x63])); // <doc

        bytes = readBuffer(reader, buffer);
        expect(bytes).to.equal(2);
        expect(buffer.slice(0, 2)).to.deep.equal(new Uint8Array([0x2f, 0x3e])); // />

        bytes = readBuffer(reader, buffer);
        expect(bytes).to.equal(0);

        closeBuffer(reader);
    });

    it('fails if fd is invalid', () => {
        const buffer = new Uint8Array(4);
        expect(readBuffer(5974, buffer)).to.equal(-1);
    });

    it('reads from buffers', () => {
        const buffers = new XmlBufferInputProvider({
            'a.xml': new TextEncoder().encode('<a/>'),
            'b.xml': new TextEncoder().encode('<b/>'),
        });
        xmlRegisterInputProvider(buffers);

        using doc = XmlDocument.fromString(`\
<?xml version="1.0"?>
<docs xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include href="a.xml"/>
  <xi:include href="b.xml"/>
</docs>
`, { option: ParseOption.XML_PARSE_XINCLUDE });

        expect(doc.get('/docs/a')).to.not.be.null;
        expect(doc.get('/docs/b')).to.not.be.null;
    });

    it('adds new buffer', () => {
        const buffers = new XmlBufferInputProvider({});
        buffers.addBuffer('a.xml', new TextEncoder().encode('<a/>'));
        xmlRegisterInputProvider(buffers);

        using doc = XmlDocument.fromString(`\
<?xml version="1.0"?>
<docs xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include href="a.xml"/>
</docs>
`, { option: ParseOption.XML_PARSE_XINCLUDE });

        expect(doc.get('/docs/a')).to.not.be.null;
    });

    it('removes buffer', () => {
        const buffers = new XmlBufferInputProvider({
            'a.xml': new TextEncoder().encode('<a/>'),
        });
        buffers.removeBuffer('a.xml');
        xmlRegisterInputProvider(buffers);

        expect(() => XmlDocument.fromString(`\
<?xml version="1.0"?>
<docs xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include href="a.xml"/>
</docs>
`, { option: ParseOption.XML_PARSE_XINCLUDE })).to.throw();
    });
});

describe('XmlStringOutputBufferHandler', () => {
    it('accumulates decoded string data', () => {
        const handler = new XmlStringOutputBufferHandler();

        const data1 = new TextEncoder().encode('<test>');
        const data2 = new TextEncoder().encode('content</test>');

        const bytesWritten1 = handler.write(data1);
        const bytesWritten2 = handler.write(data2);

        expect(bytesWritten1).to.equal(data1.byteLength);
        expect(bytesWritten2).to.equal(data2.byteLength);
        expect(handler.result).to.equal('<test>content</test>');
    });

    it('returns true on close', () => {
        const handler = new XmlStringOutputBufferHandler();
        expect(handler.close()).to.be.true;
    });

    it('handles empty input', () => {
        const handler = new XmlStringOutputBufferHandler();
        const emptyData = new Uint8Array(0);

        const bytesWritten = handler.write(emptyData);

        expect(bytesWritten).to.equal(0);
        expect(handler.result).to.equal('');
    });

    it('handles multiple writes with non-ASCII characters', () => {
        const handler = new XmlStringOutputBufferHandler();

        const data1 = new TextEncoder().encode('<résumé>');
        const data2 = new TextEncoder().encode('профиль</résumé>');

        handler.write(data1);
        handler.write(data2);

        expect(handler.result).to.equal('<résumé>профиль</résumé>');
    });
});
