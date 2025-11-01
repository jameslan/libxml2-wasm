import { expect } from 'chai';
import {
    ParseOption,
    XmlBufferInputProvider,
    xmlCleanupInputProvider,
    XmlDocument,
    XmlElement,
    XmlError,
    XmlNode,
    XmlParseError,
    xmlRegisterInputProvider,
} from '@libxml2-wasm/lib/index.mjs';
import { XmlStringOutputBufferHandler } from '@libxml2-wasm/lib/utils.mjs';

describe('XmlDocument', () => {
    const doc = XmlDocument.fromString('<docs><doc></doc></docs>');
    after(() => doc.dispose());

    describe('root property', () => {
        it('returns root element', () => {
            const { root } = doc;
            expect(root).to.be.instanceOf(XmlElement);
            expect(root.name).to.equal('docs');
        });

        it('returns null if root doesn\'t exist', () => {
            using d = XmlDocument.create();
            expect(() => d.root).to.throw(XmlError);
        });

        it('moves root from another doc', () => {
            using doc1 = XmlDocument.create();
            using doc2 = XmlDocument.fromString('<docs><doc/></docs>');

            const docsNode = doc2.root;
            const docNode = docsNode.firstChild;
            expect(docsNode.doc).to.equal(doc2);
            expect(docNode?.doc).to.equal(doc2);

            doc1.root = doc2.root;

            expect(doc1.root.name).to.equal('docs');
            expect(() => doc2.root).to.throw(XmlError); // no root
            expect(docsNode.doc).to.equal(doc1);
            expect(docNode?.doc).to.equal(doc1);
        });

        it('sets root to replace existing root', () => {
            using doc1 = XmlDocument.fromString('<docs><doc/></docs>');
            using doc2 = XmlDocument.fromString('<doc/>');

            doc1.root = doc2.root;
            expect(doc1.root.name).to.equal('doc');
        });

        it('sets root from a new node', () => {
            const newDoc = XmlDocument.create();
            newDoc.createRoot('docs');
            expect(newDoc.toString()).to.equal(`\
<?xml version="1.0"?>
<docs/>
`);
        });

        it('sets root from a new node with namespace', () => {
            const newDoc = XmlDocument.create();
            newDoc.createRoot('docs', 'http://example.com');
            expect(newDoc.toString()).to.equal(`\
<?xml version="1.0"?>
<docs xmlns="http://example.com"/>
`);
        });

        it('set root from a new node with namespace and prefix', () => {
            const newDoc = XmlDocument.create();
            newDoc.createRoot('docs', 'http://example.com', 'ex');
            expect(newDoc.toString()).to.equal(`\
<?xml version="1.0"?>
<ex:docs xmlns:ex="http://example.com"/>
`);
        });
    });

    describe('get', () => {
        it('should query based on root element', () => {
            expect(doc.get('docs')).to.be.null;
            expect((doc.get('doc') as XmlElement).name).to.equal('doc');
            expect((doc.get('/docs/doc') as XmlElement).name).to.equal('doc');
        });
    });

    describe('toBuffer (deprecated)', () => {
        it('formats output by default', () => {
            const handler = new XmlStringOutputBufferHandler();
            doc.toBuffer(handler);
            expect(handler.result).to.equal(`\
<?xml version="1.0"?>
<docs>
  <doc/>
</docs>
`);
        });
    });

    describe('toString', () => {
        it('formats output by default', () => {
            expect(doc.toString()).to.equal(`\
<?xml version="1.0"?>
<docs>
  <doc/>
</docs>
`);
        });

        it('not format when required', () => {
            expect(doc.toString({ format: false })).to.equal(`\
<?xml version="1.0"?>
<docs><doc/></docs>
`);
        });

        it('can set indent string', () => {
            expect(doc.toString({ format: true, indentString: '    ' })).to.equal(`\
<?xml version="1.0"?>
<docs>
    <doc/>
</docs>
`);
        });

        it('can omit xml declaration', () => {
            expect(doc.toString({ format: true, noDeclaration: true })).to.equal(`\
<docs>
  <doc/>
</docs>
`);
        });

        it('can avoid empty tags', () => {
            expect(doc.toString({ format: true, noEmptyTags: true })).to.equal(`\
<?xml version="1.0"?>
<docs>
  <doc></doc>
</docs>
`);
        });

        it('fails to set indent string longer than MAX_INDENT', () => {
            expect(() => doc.toString({ format: true, indentString: ' '.repeat(61) })).to.throw(
                XmlError,
                'Failed to set indent string',
            );
        });

        it('handles diacritics', () => {
            using d = XmlDocument.fromString(
                `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <name>Jan Sedloň</name>
</root>
`,
                { url: 'test/testfiles/diacritics.xml' },
            );
            const text = d.toString();
            expect(text).to.contain('Jan Sedloň');
        });
    });

    describe('processXInclude', () => {
        afterEach(() => {
            xmlCleanupInputProvider();
        });

        it('does nothing w/o XInclude nodes', () => {
            expect(doc.processXInclude()).to.equal(0);
            expect(doc.toString({ format: false })).to.equal('<?xml version="1.0"?>\n<docs><doc/></docs>\n');
        });

        it('processes XInclude nodes', () => {
            const buffers = new XmlBufferInputProvider({});
            buffers.addBuffer('a.xml', new TextEncoder().encode('<a/>'));
            xmlRegisterInputProvider(buffers);

            using xinc = XmlDocument.fromString(`\
<?xml version="1.0"?>
<docs xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include href="a.xml"/>
</docs>
`);
            expect(xinc.processXInclude()).to.equal(1);
            expect(xinc.get('/docs/a')).to.not.be.null;
        });
    });

    describe('dtd', () => {
        it('should parse dtd', () => {
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
            expect(xml.dtd?.doc).to.equal(xml);
        });

        it('should return null if no dtd', () => {
            using xml = XmlDocument.fromString('<docs><doc/></docs>');
            expect(xml.dtd).to.be.null;
        });

        it('should validate dtd', () => {
            // missing element heading and body
            expect(() => XmlDocument.fromString(
                `<?xml version="1.0"?>
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
</note>`,
                { option: ParseOption.XML_PARSE_DTDVALID },
            )).to.throw(XmlParseError);
        });
    });

    describe('eval', () => {
        it('should return XmlNode[] for node set expressions', () => {
            const result = doc.eval('/docs/doc');
            expect(result).to.be.an('array');
            expect(result).to.have.length(1);
            expect((result as XmlNode[])[0]).to.be.instanceOf(XmlElement);
        });

        it('should return number for numeric XPath expressions', () => {
            const result = doc.eval('count(/docs/doc)');
            expect(result).to.be.a('number');
            expect(result).to.equal(1);
        });

        it('should return boolean for boolean XPath expressions', () => {
            const result = doc.eval('count(/docs/doc) = 1');
            expect(result).to.be.a('boolean');
            expect(result).to.equal(true);
        });

        it('should return boolean false for false conditions', () => {
            const result = doc.eval('count(/docs/doc) > 5');
            expect(result).to.be.a('boolean');
            expect(result).to.equal(false);
        });

        it('should return string for string XPath expressions', () => {
            const result = doc.eval('string(/docs/doc)');
            expect(result).to.be.a('string');
            expect(result).to.equal('');
        });
    });
});
