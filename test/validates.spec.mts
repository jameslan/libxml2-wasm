import { expect } from 'chai';
import { XsdValidator, XmlValidateError } from '../lib/validates.mjs';
import { XmlDocument } from '../lib/document.mjs';
import { XmlError } from '../lib/libxml2.mjs';

describe('XsdValidator', () => {
    const xsd = `<?xml version="1.0"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:element name="bookstore" type="Bookstore"/>
  <xsd:complexType name="Bookstore">
    <xsd:sequence>
      <xsd:element name="book" type="Book" maxOccurs="unbounded"/>
    </xsd:sequence>
  </xsd:complexType>
  <xsd:complexType name="Book">
    <xsd:sequence>
      <xsd:element name="title" type="xsd:string"/>
      <xsd:element name="price" type="xsd:decimal"/>
    </xsd:sequence>
  </xsd:complexType>
</xsd:schema>`;

    it('should succeed on valid xml', () => {
        const validator = XsdValidator.fromDoc(XmlDocument.fromString(xsd));
        const xml = XmlDocument.fromString(`<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
    <book><title>Harry Potter</title><price><![CDATA[29.99]]></price></book>
    <book><title>Learning XML</title><price>39.95</price></book>
</bookstore>`);
        validator.validate(xml);
        xml.dispose();
        validator.dispose();
    });

    it('should fail on invalid xml', () => {
        const validator = XsdValidator.fromDoc(XmlDocument.fromString(xsd));
        const xml = XmlDocument.fromString(
            '<bookstore><book><title>Harry Potter</title></book></bookstore>',
        );
        expect(() => validator.validate(xml)).to.throw(XmlValidateError, 'Missing child element');
        xml.dispose();
        validator.dispose();
    });

    it('should fail on invalid input', () => {
        const validator = XsdValidator.fromDoc(XmlDocument.fromString(xsd));
        const xml = XmlDocument.create();
        xml.dispose();
        expect(() => validator.validate(xml)).to.throw(XmlError, 'Invalid input or internal error');
        validator.dispose();
    });
});

describe('DtdValidator', () => {

});

describe('RelaxNGValidator', () => {

});
