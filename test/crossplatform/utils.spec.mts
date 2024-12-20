import { expect } from 'chai';
import {
    openBuffer,
    readBuffer,
    closeBuffer,
    XmlBufferInputProvider,
    xmlCleanupInputProvider,
    XmlDocument,
    xmlRegisterInputProvider,
} from '@libxml2-wasm/lib/index.mjs';

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
`);

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
`);

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
`)).to.throw();
    });
});
