import { expect } from 'chai';
import { parseXmlString } from '../lib/index.mjs';
import exp from 'constants';

describe('parseXmlString', () => {
    it('should parse valid xml string', () => {
        const doc = parseXmlString('<doc/>');

        expect(doc).is.not.null;
        expect(doc!._docPtr).to.be.a('number');
        expect(doc!._docPtr).to.not.equal(0);
        expect(doc!.root).is.not.null
        expect(doc!.root!.name).equals('doc');

        doc!.dispose()
    });

    it('should return null on invalid xml string', () => {
        const doc = parseXmlString('<doc>');
        expect(doc).to.be.null;
    });
});
