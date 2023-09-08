import { expect } from 'chai';
import { parseXmlString } from '../lib/index.mjs';

describe('parseXmlString', () => {
    it('should parse xml string', () => {
        const doc = parseXmlString('<doc/>');
        expect(doc.xmlDocPtr).to.be.a('number');
        expect(doc.xmlDocPtr).to.not.equal(0);
        doc.dispose()
    });
});
