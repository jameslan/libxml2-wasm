import { readFileSync } from 'node:fs';

import { expect, use as chaiUse } from 'chai';
import chaiSorted from 'chai-sorted';

chaiUse(chaiSorted);

describe('bindings', () => {
    it('has sorted exported-functions file', () => {
        const exports = readFileSync('binding/exported-functions.txt', 'utf-8')
            .split('\n')
            .filter((s) => s.length > 0);
        expect(exports).to.be.sorted();
    });

    it('has sorted exported-runtime-functions file', () => {
        const exports = readFileSync('binding/exported-runtime-functions.txt', 'utf-8')
            .split('\n')
            .filter((s) => s.length > 0);
        expect(exports).to.be.sorted();
    });
});
