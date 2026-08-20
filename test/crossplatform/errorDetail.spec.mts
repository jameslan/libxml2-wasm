import { expect } from 'chai';

import { XmlErrorStruct, xmlGetNodePath } from '@libxml2-wasm/lib/libxml2.mjs';

describe('XmlErrorStruct / xmlGetNodePath', () => {
    it('XmlErrorStruct.node returns 0 for a null error pointer', () => {
        expect(XmlErrorStruct.node(0)).to.equal(0);
    });

    it('xmlGetNodePath returns null for a null node pointer', () => {
        expect(xmlGetNodePath(0)).to.be.null;
    });
});
