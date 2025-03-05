import { expect } from 'chai';
import {
    XmlBufferInputProvider,
    xmlCleanupInputProvider,
    XmlDocument,
    XmlElement,
    XmlError,
    xmlRegisterInputProvider,
} from '@libxml2-wasm/lib/index.mjs';

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
    });

    describe('processXInclude', () => {
        afterEach(() => {
            xmlCleanupInputProvider();
        });

        it('does nothing w/o XInclude nodes', () => {
            expect(doc.processXIncludeSync()).to.equal(0);
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
            expect(xinc.processXIncludeSync()).to.equal(1);
            expect(xinc.get('/docs/a')).to.not.be.null;
        });
    });
});
