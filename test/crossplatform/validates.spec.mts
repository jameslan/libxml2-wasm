import { expect } from 'chai';
import {
    XmlDocument,
    XmlError,
    XmlValidateError,
    XsdValidator,
    RelaxNGValidator,
    xmlCleanupInputProvider,
    XmlInputProvider,
    xmlRegisterInputProvider,
    XmlElement,
} from '@libxml2-wasm/lib/index.mjs';

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
        const schema = XmlDocument.fromString(xsd);
        const validator = XsdValidator.fromDoc(schema);
        schema.dispose();

        const xml = XmlDocument.fromString(`<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
    <book><title>Harry Potter</title><price><![CDATA[29.99]]></price></book>
    <book><title>Learning XML</title><price>39.95</price></book>
</bookstore>`);

        validator.validate(xml);

        xml.dispose();
        validator.dispose();
    });

    it('should validate subtree', () => {
        using schema = XmlDocument.fromString(xsd);
        using validator = XsdValidator.fromDoc(schema);
        using xml = XmlDocument.fromString(`<?xml version="1.0" encoding="UTF-8"?>
<market>
    <bookstore>
        <book><title>Harry Potter</title><price><![CDATA[29.99]]></price></book>
        <book><title>Learning XML</title><price>39.95</price></book>
    </bookstore>
    <bookstore>
        <book><title>Harry Potter</title><price><![CDATA[29.99]]></price></book>
        <book><title>Learning XML</title><price>39.95</price></book>
    </bookstore>
</market>`);

        xml.find('/market/bookstore').forEach((bookstore) => validator.validate(bookstore as XmlElement));
    });

    it('should fail on invalid xml', () => {
        using schema = XmlDocument.fromString(xsd);
        using validator = XsdValidator.fromDoc(schema);

        using xml = XmlDocument.fromString(
            '<bookstore><book><title>Harry Potter</title></book></bookstore>',
        );

        expect(() => validator.validate(xml)).to.throw(
            XmlValidateError,
            'Missing child element',
        ).with.deep.property(
            'details',
            [{
                message: 'Element \'book\': Missing child element(s). Expected is ( price ).\n',
                line: 1,
                col: 0,
            }],
        );
    });

    it('should throw exception with all errors on invalid xml', () => {
        using schema = XmlDocument.fromString(xsd);
        using validator = XsdValidator.fromDoc(schema);

        using xml = XmlDocument.fromString(
            `<bookstore><book><title>Harry Potter</title></book>
            <book><title>Learning XML</title></book></bookstore>`,
        );

        expect(() => validator.validate(xml)).to.throw(
            XmlValidateError,
            'Missing child element',
            ).with.deep.property(
                'details',
            [{
                message: 'Element \'book\': Missing child element(s). Expected is ( price ).\n',
                line: 1,
                col: 0,
            }, {
                message: 'Element \'book\': Missing child element(s). Expected is ( price ).\n',
                line: 2,
                col: 0,
            }],
        );
    });

    it('should fail on invalid input', () => {
        using schema = XmlDocument.fromString(xsd);
        const validator = XsdValidator.fromDoc(schema);

        const xml = XmlDocument.create();
        xml.dispose(); // dispose XmlDocument to make it invalid input of validation

        expect(() => validator.validate(xml)).to.throw(XmlError, 'Invalid input or internal error');

        validator.dispose();
    });

    it('should fail on null schema', () => {
        const schema = XmlDocument.create();
        schema.dispose();
        expect(() => XsdValidator.fromDoc(schema)).to.throw(XmlError, 'Schema is null or failed to allocate memory');
    });

    it('should fail on invalid schema', () => {
        const schema = XmlDocument.fromString(`<?xml version="1.0"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:element name="bookstore" type="Bookstore"/>
  <xsd:complexType name="Bookstore">
    <xsd:sequence>
      <xsd:element name="book" type="Book" maxOccurs="unbounded"/>
    </xsd:sequence>
  </xsd:complexType>
</xsd:schema>`);
        expect(() => XsdValidator.fromDoc(schema)).to.throw(
            XmlValidateError,
            'attribute \'type\':',
        ).with.deep.property(
            'details',
            [{
                message: 'element decl. \'book\', attribute \'type\': The QName value \'Book\' does not resolve to a(n) type definition.\n',
                line: 6,
                col: 0,
            }],
        );
        schema.dispose();
    });

    it('could validate multiple files', () => {
        using schema = XmlDocument.fromString(xsd);
        using validator = XsdValidator.fromDoc(schema);

        using xml1 = XmlDocument.fromString(
            '<bookstore><book><title>Harry Potter</title></book></bookstore>',
        );

        expect(() => validator.validate(xml1)).to.throw(
            XmlValidateError,
            'Missing child element',
        ).with.deep.property(
            'details',
            [{
                message: 'Element \'book\': Missing child element(s). Expected is ( price ).\n',
                line: 1,
                col: 0,
            }],
        );

        using xml2 = XmlDocument.fromString(
            `<bookstore><book><title>Harry Potter</title></book>
            <book><title>Learning XML</title></book></bookstore>`,
        );
        expect(() => validator.validate(xml2)).to.throw(
            XmlValidateError,
            'Missing child element',
        ).with.deep.property(
            'details',
            [{
                message: 'Element \'book\': Missing child element(s). Expected is ( price ).\n',
                line: 1,
                col: 0,
            }, {
                message: 'Element \'book\': Missing child element(s). Expected is ( price ).\n',
                line: 2,
                col: 0,
            }],
        );
    });

    describe('string input callbacks', () => {
        const documents: { [filename: string ]: string } = {
            'test/author.xsd':
                `<?xml version="1.0" encoding="utf-8"?>
                 <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" attributeFormDefault="unqualified">
                     <xsd:complexType name="author">
                         <xsd:sequence>
                             <xsd:element minOccurs="1" maxOccurs="1" name="first-name" type="xsd:string" />
                             <xsd:element minOccurs="1" maxOccurs="1" name="last-name" type="xsd:string" />
                             <xsd:element minOccurs="0" maxOccurs="1" name="country" type="xsd:string" />
                         </xsd:sequence>
                     </xsd:complexType>
                 </xsd:schema>`,
            'book.xsd':
                `<?xml version="1.0" encoding="utf-8"?>
                <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" attributeFormDefault="unqualified">
                    <xsd:include schemaLocation="author.xsd" />
                    <xsd:element name="book">
                        <xsd:complexType>
                            <xsd:sequence>
                                <xsd:element name="title" type="xsd:string" maxOccurs="1" minOccurs="1" />
                                <xsd:element name="author" type="author" maxOccurs="1" minOccurs="1" />
                            </xsd:sequence>
                        </xsd:complexType>
                    </xsd:element>
                </xsd:schema>`,
            'book_wronginclude.xsd':
                `<?xml version="1.0" encoding="utf-8"?>
                <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified" attributeFormDefault="unqualified">
                    <xsd:include schemaLocation="wronginclude.xsd" />
                    <xsd:element name="book">
                        <xsd:complexType>
                            <xsd:sequence>
                                <xsd:element name="title" type="xsd:string" maxOccurs="1" minOccurs="1" />
                                <xsd:element name="author" type="author" maxOccurs="1" minOccurs="1" />
                            </xsd:sequence>
                        </xsd:complexType>
                    </xsd:element>
                </xsd:schema>`,
            'book.xml':
                `<?xml version="1.0" encoding="utf-8"?>
                <book xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="book.xsd">
                    <title>Dune</title>
                    <author>
                        <first-name>Frank</first-name>
                        <last-name>Herbert</last-name>
                        <country>USA</country>
                    </author>
                </book>`,
        };
        /**
         * Simple array to keep file descriptors. First element is dummy to avoid returning 0 for fd
         */
        const fds: Array<{ filename: string, pos: number }> = [
            { filename: 'dummy', pos: -1 },
        ];

        before(() => {
            const provider: XmlInputProvider = {
                match: (filename: string) => {
                    if (filename.endsWith('.xsd') || filename.endsWith('.xml')) {
                        return true;
                    }
                    return false;
                },
                open: (filename: string) => {
                    if (!(filename in documents)) {
                        return undefined;
                    }
                    const fd = fds.length;
                    fds[fd] = {
                        filename,
                        pos: 0,
                    };
                    return fd;
                },
                read: (fd: number, buf: Uint8Array) => {
                    if (fd >= fds.length || fds[fd].pos === -1) {
                        return -1;
                    }
                    const content = documents[fds[fd].filename].substring(fds[fd].pos, buf.length);
                    const { read } = new TextEncoder().encodeInto(content, buf);
                    fds[fd].pos += read;
                    return read;
                },
                close: (fd: number) => {
                    if (fd >= fds.length || fds[fd].pos === -1) {
                        return false;
                    }
                    fds[fd].pos = -1;
                    return true;
                },
            };
            expect(xmlRegisterInputProvider(provider)).to.be.true;
        });

        after(() => {
            xmlCleanupInputProvider();
        });

        it('should be able to handle includes when strings are read', () => {
            const schemaDoc = XmlDocument.fromString(documents['book.xsd'], { url: 'test/book.xsd' });
            const validator = XsdValidator.fromDoc(schemaDoc);
            const instDoc = XmlDocument.fromString(documents['book.xml']);
            validator.validate(instDoc);
            instDoc.dispose();
            validator.dispose();
            schemaDoc.dispose();
        });

        it('should be able to report error conditions', () => {
            // open succeeds, but include shall fail
            const wrongIncludeDoc = XmlDocument.fromString(documents['book_wronginclude.xsd']);
            expect(() => XsdValidator.fromDoc(wrongIncludeDoc)).to.throw();
            wrongIncludeDoc.dispose();
        });
    });
});

describe('DtdValidator', () => {

});

describe('RelaxNGValidator', () => {
    const rng = `<?xml version="1.0" encoding="UTF-8"?>
<grammar ns="" xmlns="http://relaxng.org/ns/structure/1.0" datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes">
    <start>
        <element name="bookstore">
            <oneOrMore>
                <element name="book">
                    <element name="title">
                        <text/>
                    </element>
                    <element name="price">
                        <data type="decimal"/>
                    </element>
                </element>
            </oneOrMore>
        </element>
    </start>
</grammar>
`;

    it('should succeed with valid xml', () => {
        using schema = XmlDocument.fromString(rng);
        using validator = RelaxNGValidator.fromDoc(schema);

        using xml = XmlDocument.fromString(`<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
    <book><title>Harry Potter</title><price><![CDATA[29.99]]></price></book>
    <book><title>Learning XML</title><price>39.95</price></book>
</bookstore>`);

        validator.validate(xml);
    });

    it('should fail on invalid xml', () => {
        using schema = XmlDocument.fromString(rng);
        using validator = RelaxNGValidator.fromDoc(schema);

        using xml = XmlDocument.fromString(
            '<bookstore><book><title>Harry Potter</title></book></bookstore>',
        );

        expect(() => validator.validate(xml)).to.throw(
            XmlValidateError,
            'Expecting an element',
        ).with.deep.property(
            'details',
            [{
                message: 'Expecting an element , got nothing\n',
                line: 1,
                col: 0,
            }],
        );
    });

    it('should throw exception with all errors  on invalid xml', () => {
        using schema = XmlDocument.fromString(rng);
        using validator = RelaxNGValidator.fromDoc(schema);

        using xml = XmlDocument.fromString(
            '<bookstore><book><title>Harry Potter</title></book>\n<book><title>Learning XML</title></book></bookstore>',
        );

        expect(() => validator.validate(xml)).to.throw(
            XmlValidateError,
            'Expecting an element',
            ).with.deep.property(
                'details',
            [{
                message: 'Expecting an element , got nothing\n',
                line: 1,
                col: 0,
            }, {
                message: 'Expecting an element , got nothing\n',
                line: 2,
                col: 0,
            }],
        );
    });

    it('should fail on invalid input', () => {
        using schema = XmlDocument.fromString(rng);
        const validator = RelaxNGValidator.fromDoc(schema);

        const xml = XmlDocument.create();
        xml.dispose(); // dispose XmlDocument to make it invalid input of validation

        expect(() => validator.validate(xml)).to.throw(XmlError, 'Invalid input or internal error');

        validator.dispose();
    });

    it('should fail on null schema', () => {
        const schema = XmlDocument.create();
        schema.dispose();
        expect(() => RelaxNGValidator.fromDoc(schema)).to.throw(
            XmlError,
            'Schema is null or failed to allocate memory',
        );
    });

    it('should fail on invalid schema', () => {
        const xsd = XmlDocument.fromString(`<?xml version="1.0"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:element name="bookstore" type="Bookstore"/>
  <xsd:complexType name="Bookstore">
    <xsd:sequence>
      <xsd:element name="book" type="xsd:string" maxOccurs="unbounded"/>
    </xsd:sequence>
  </xsd:complexType>
</xsd:schema>`);

        // parse xsd as rng
        expect(() => RelaxNGValidator.fromDoc(xsd)).to.throw(
            XmlValidateError,
            'schemas is empty',
        ).with.deep.property(
            'details',
            [{
                message: 'xmlRelaxNGParse: schemas is empty\n',
                line: -1,
                col: 0,
            }],
        );
        xsd.dispose();
    });

    it('could validate multiple xml', () => {
        using schema = XmlDocument.fromString(rng);
        using validator = RelaxNGValidator.fromDoc(schema);

        using xml1 = XmlDocument.fromString(
            '<bookstore><book><title>Harry Potter</title></book></bookstore>',
        );

        expect(() => validator.validate(xml1)).to.throw(
            XmlValidateError,
            'Expecting an element',
        ).with.deep.property(
            'details',
            [{
                message: 'Expecting an element , got nothing\n',
                line: 1,
                col: 0,
            }],
        );

        using xml2 = XmlDocument.fromString(
            '<bookstore><book><title>Harry Potter</title></book>\n<book><title>Learning XML</title></book></bookstore>',
        );

        expect(() => validator.validate(xml2)).to.throw(
            XmlValidateError,
            'Expecting an element',
        ).with.deep.property(
            'details',
            [{
                message: 'Expecting an element , got nothing\n',
                line: 1,
                col: 0,
            }, {
                message: 'Expecting an element , got nothing\n',
                line: 2,
                col: 0,
            }],
        );
    });
});
