import { expect } from 'chai';
import { XmlDocument, XmlElement, XsdValidator } from '@libxml2-wasm/lib/index.mjs';
import * as fs from 'node:fs/promises';

// Use iso8859-15 input, which has to be a file, and has to use node fs module to read the file
describe('encoding', () => {
    let xmlBuffer: Buffer;

    before(async () => {
        xmlBuffer = await fs.readFile('test/testfiles/iso8859-15.xml');
    });

    describe('parse', () => {
        it('should support non-utf8 encoding', () => {
            using doc = XmlDocument.fromBuffer(
                xmlBuffer,
                { encoding: 'iso8859-15' },
            );
            expect(doc.get('asdf/@RT')?.content).to.equal('Müller');
        });

        it('should use encoding from xml declaration', () => {
            using doc = XmlDocument.fromBuffer(xmlBuffer);
            expect(doc.get('asdf/@RT')?.content).to.equal('Müller');
        });
    });

    describe('validate', () => {
        it('should validate with xsd', () => {
            using doc = XmlDocument.fromBuffer(xmlBuffer);
            using schema = XmlDocument.fromString(`<?xml version="1.0" encoding="utf-8"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:simpleType name="RTType">
    <xsd:restriction base="xsd:string">
      <xsd:enumeration value="Müller"/>
    </xsd:restriction>
  </xsd:simpleType>
  <xsd:element name="levelone">
    <xsd:complexType>
      <xsd:sequence>
        <xsd:element name="asdf">
          <xsd:complexType>
            <xsd:attribute name="RT" type="RTType" use="required"/>
          </xsd:complexType>
        </xsd:element>
      </xsd:sequence>
    </xsd:complexType>
  </xsd:element>
</xsd:schema>`);
            using validator = XsdValidator.fromDoc(schema);
            validator.validate(doc);
        });
    });

    describe('document save', () => {
        it('saves to original encoding by default', () => {
            using doc = XmlDocument.fromBuffer(xmlBuffer);

            const outputBuffer = Buffer.alloc(xmlBuffer.length);
            doc.save({
                write: (buf: Uint8Array) => { outputBuffer.set(buf); return buf.byteLength; },
                close: () => true,
            });
            expect(outputBuffer).to.deep.equal(xmlBuffer);
        });

        it('saves to specified encoding', () => {
            using doc = XmlDocument.fromBuffer(xmlBuffer);

            expect(doc.toString()).to.equal(`\
<?xml version="1.0" encoding="utf-8"?>
<levelone>
   <asdf RT="Müller"/>
</levelone>
`);
        });

        it.skip('saves to specified encoding without format', () => {
            using doc = XmlDocument.fromBuffer(xmlBuffer);

            expect(doc.toString({ format: false })).to.equal(`\
<?xml version="1.0" encoding="utf-8"?>
<levelone><asdf RT="Müller"/></levelone>
`);
        });
    });

    describe('element save', () => {
        it('save to utf-8 by default', () => {
            using doc = XmlDocument.fromBuffer(xmlBuffer);

            const outputBuffer = Buffer.alloc(xmlBuffer.length);
            (doc.get('/levelone/asdf') as XmlElement).save({
                write: (buf: Uint8Array) => { outputBuffer.set(buf); return buf.byteLength; },
                close: () => true,
            });
            expect(outputBuffer.indexOf(Buffer.from('RT="Müller"'))).to.above(0);
        });

        it('save utf-8 xml to other encoding', () => {
            using doc = XmlDocument.fromString(`\
<?xml version="1.0" encoding="utf-8"?>
<levelone>
    <asdf RT="Müller"/>
</levelone>`);

            const outputBuffer = Buffer.alloc(1024);
            (doc.get('/levelone/asdf') as XmlElement).save({
                write: (buf: Uint8Array) => { outputBuffer.set(buf); return buf.byteLength; },
                close: () => true,
            }, { encoding: 'iso8859-15' });
            const posRT = outputBuffer.indexOf(Buffer.from('RT="M'));
            expect(outputBuffer[posRT + 5]).to.equal(0xfc); // ü
            expect(outputBuffer[posRT + 6]).to.equal(0x6c); // l
            expect(outputBuffer[posRT + 7]).to.equal(0x6c); // l
            expect(outputBuffer[posRT + 8]).to.equal(0x65); // e
        });
    });
});
