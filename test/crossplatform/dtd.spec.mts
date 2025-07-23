import { expect } from 'chai';
import {
    DtdValidator,
    ParseOption,
    XmlBufferInputProvider,
    xmlCleanupInputProvider,
    XmlDocument,
    XmlDtd,
    XmlParseError,
    xmlRegisterInputProvider,
    XmlValidateError,
} from '@libxml2-wasm/lib/index.mjs';

describe('XmlDtd', () => {
    it('should get dtd from document', () => {
        using xml = XmlDocument.fromString(`\
<?xml version="1.0"?>
<!DOCTYPE note [
<!ELEMENT note (to,from,heading,body)>
<!ELEMENT to (#PCDATA)>
<!ELEMENT from (#PCDATA)>
<!ELEMENT heading (#PCDATA)>
<!ELEMENT body (#PCDATA)>
]>
<note>
<to>Tove</to>
<from>Jani</from>
<heading>Reminder</heading>
<body>Don't forget me this weekend</body>
</note>`);
        const dtd = xml.dtd!;
        expect(dtd.doc).to.equal(xml);

        // Because the DTD is owned by the document, it won't be actually disposed
        dtd.dispose();
        using dtd2 = xml.dtd!;
        expect(dtd2.doc).to.equal(xml);
        expect(dtd2).to.not.equal(dtd); // dtd2 is another wrapper instance
    });

    it('can free document before DTD', () => {
        const xml = XmlDocument.fromString(`\
<?xml version="1.0"?>
<!DOCTYPE note [
<!ELEMENT note (to,from,heading,body)>
<!ELEMENT to (#PCDATA)>
<!ELEMENT from (#PCDATA)>
]>
<note>
</note>`);
        const dtd = xml.dtd!;
        xml.dispose();
        using xml2 = XmlDocument.fromString(`\
<?xml version="1.0"?>
<!DOCTYPE docs [
<!ELEMENT docs (doc)>
<!ELEMENT doc (#PCDATA)>
]>
<docs><doc/></docs>`);
        expect(dtd).to.not.equal(xml2.dtd);
        dtd.dispose();
    });

    it('loads external DTD from buffer', () => {
        using dtd = XmlDtd.fromBuffer(new TextEncoder().encode(`
<!ELEMENT note (to,from,heading,body)>
<!ELEMENT to (#PCDATA)>
<!ELEMENT from (#PCDATA)>
<!ELEMENT heading (#PCDATA)>
<!ELEMENT body (#PCDATA)>
`));
        expect(dtd.doc).to.be.null;
        using validator = new DtdValidator(dtd);
        using xml = XmlDocument.fromString(`\
<?xml version="1.0"?>
<note>
<to>Tove</to>
<from>Jani</from>
<heading>Reminder</heading>
<body>Don't forget me this weekend</body>
</note>`);
        expect(() => validator.validate(xml)).to.not.throw();
    });

    it('loads external DTD from string', () => {
        using dtd = XmlDtd.fromString(`
<!ELEMENT note (to,from,heading,body)>
<!ELEMENT to (#PCDATA)>
<!ELEMENT from (#PCDATA)>
<!ELEMENT heading (#PCDATA)>
<!ELEMENT body (#PCDATA)>
`);
        expect(dtd.doc).to.be.null;
        using validator = new DtdValidator(dtd);
        using xml = XmlDocument.fromString(`\
<?xml version="1.0"?>
<note>
<to>Tove</to>
<from>Jani</from>
<heading>Reminder</heading>
<body>Don't forget me this weekend</body>
</note>`);
        expect(() => validator.validate(xml)).to.not.throw();
    });

    it('fails on invalid DTD', () => {
        expect(() => XmlDtd.fromString(`
<!ELEMENT note (to,from)>
<!ELEMENT to (#PCDATA)>
<ELEMENT from (#PCDATA)>
`)).to.throw(XmlParseError, 'Content error in the external subset');
    });

    it('fails DTD validation when document does not conform', () => {
        using dtd = XmlDtd.fromString(`
<!ELEMENT note (to,from,heading,body)>
<!ELEMENT to (#PCDATA)>
<!ELEMENT from (#PCDATA)>
<!ELEMENT heading (#PCDATA)>
<!ELEMENT body (#PCDATA)>
`);
        using validator = new DtdValidator(dtd);

        // XML document missing required 'heading' and 'body' elements
        using xml = XmlDocument.fromString(`\
<?xml version="1.0"?>
<note>
<to>Tove</to>
<from>Jani</from>
</note>`);

        expect(() => validator.validate(xml)).to.throw(XmlValidateError);
    });

    describe('load external subset', () => {
        afterEach(() => {
            xmlCleanupInputProvider();
        });

        it('validate with external subset', () => {
            const buffers = new XmlBufferInputProvider({
                'http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd': new TextEncoder().encode(`\
<!ELEMENT note (to,from,heading,body)>
<!ELEMENT to (#PCDATA)>
<!ELEMENT from (#PCDATA)>
<!ELEMENT heading (#PCDATA)>
<!ELEMENT body (#PCDATA)>
`),
            });
            xmlRegisterInputProvider(buffers);

            // missing element heading and body
            using xml = XmlDocument.fromString(`\
<?xml version="1.0"?>
<!DOCTYPE html PUBLIC
  "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<note>
<to>Tove</to>
<from>Jani</from>
</note>`, { option: ParseOption.XML_PARSE_DTDLOAD }); // this option is required to load external subset
            using validator = new DtdValidator(xml.dtd!);
            expect(() => validator.validate(xml)).to.throw(XmlValidateError);
        });
    });
});
