import { expect } from 'chai';
import { disposeBy, XmlDisposable } from '../src/disposable.mjs';

function fixture(free1: number[], free2: number[]) {
    return class Fixture extends XmlDisposable {
        @disposeBy((val) => { free1.push(val); })
        accessor p1: number

        @disposeBy((val) => { free2.push(val); })
        accessor p2: number

        constructor() {
            super();
            this.p1 = 51;
            this.p2 = 52;
        }
    };
}

describe('Dispose', () => {
    it('gc should release unused', async () => {
        const f1: number[] = [];
        const f2: number[] = [];

        {
            const Fixture = fixture(f1, f2);
            new Fixture(); // eslint-disable-line no-new
        }

        // reset array, preparing for gc
        f1.length = 0;
        f2.length = 0;
        (global as any).gc();
        // allow finalizer to run
        await new Promise((resolve) => { setTimeout(resolve, 500); });

        expect(f1).to.deep.equal([51]);
        expect(f2).to.deep.equal([52]);
    });

    it('disposed object should not be release again', async () => {
        const f1: number[] = [];
        const f2: number[] = [];

        {
            const Fixture = fixture(f1, f2);
            const obj = new Fixture();
            obj.dispose();
        }

        // reset array, preparing for gc
        f1.length = 0;
        f2.length = 0;
        (global as any).gc();
        // allow finalizer to run
        await new Promise((resolve) => { setTimeout(resolve, 500); });

        expect(f1).to.deep.equal([]);
        expect(f2).to.deep.equal([]);
    });

    it('should release previous value when new value is assigned', () => {
        const f1: number[] = [];
        const f2: number[] = [];

        const Fixture = fixture(f1, f2);
        const obj = new Fixture();

        obj.p1 = 42;

        expect(f1).to.deep.equal([51]);
    });
});
