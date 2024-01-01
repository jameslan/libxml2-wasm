import { expect } from 'chai';
import { XmlDocument, XmlElement, XmlError } from '../lib/index.mjs';

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
            const d = XmlDocument.create();
            expect(() => d.root).to.throw(XmlError);
            d.dispose();
        });
    });

    describe('get', () => {
        it('should query based on root element', () => {
            expect(doc.get('docs')).to.be.null;
            expect((doc.get('doc') as XmlElement).name).to.equal('doc');
            expect((doc.get('/docs/doc') as XmlElement).name).to.equal('doc');
        });
    });
});
