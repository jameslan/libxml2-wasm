import { expect } from 'chai';
import { XmlElement } from '../lib/nodes.mjs';
import { XmlDocument, XmlError, parseXmlString } from '../lib/index.mjs';

describe('XmlDocument', () => {
    const doc = parseXmlString('<docs><doc></doc></docs>');
    after(() => doc.dispose());

    describe('root property', () => {
        it('return root element', () => {
            const { root } = doc;
            expect(root).to.be.instanceOf(XmlElement);
            expect(root.name).to.equal('docs');
        });

        it('return null if root doesn\'t exist', () => {
            const d = new XmlDocument();
            expect(() => d.root).to.throw(XmlError);
            d.dispose();
        });
    });

    describe('get', () => {
        it('should query based on root element', () => {
            expect(doc.get('docs')).to.be.null;
            expect(doc.get('doc')?.name).to.equal('doc');
            expect(doc.get('/docs/doc')?.name).to.equal('doc');
        });
    });
});
