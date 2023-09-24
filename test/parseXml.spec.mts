import { expect } from 'chai';
import { parseXmlString } from '../lib/index.mjs';
import { XmlParseError } from '../lib/libxml2.mjs';

describe('parseXmlString', () => {
    it('should parse valid xml string', () => {
        const doc = parseXmlString('<doc/>');

        expect(doc.root.name).equals('doc');

        doc.dispose()
    });

    it('should throw exception on invalid xml string', () => {
        expect(() => parseXmlString('<doc>')).to.throw(XmlParseError);
    });
});
