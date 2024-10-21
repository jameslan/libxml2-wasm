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
    });
});
