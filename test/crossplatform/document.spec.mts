import { expect } from 'chai';
import { XmlDocument, XmlElement, XmlError } from '@libxml2-wasm/lib/index.mjs';

describe('XmlDocument', () => {
    const doc = XmlDocument.fromString('<docs><doc></doc></docs>');
    after(() => doc.dispose());

    describe('root property', () => {
        it('return root element', () => {
            const { root } = doc;
            expect(root).to.be.instanceOf(XmlElement);
            expect(root.name).to.equal('docs');
        });

        it('return null if root doesn\'t exist', () => {
            using d = XmlDocument.create();
            expect(() => d.root).to.throw(XmlError);
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

        it('move root from another doc', () => {
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

        it.skip('set root from a new node', () => {
            // TODO: after we can create a node / an element
        });
    });
});
