import { expect } from 'chai';
import { disposeBy, XmlDisposable } from '../src/disposable.mjs';

function fixture(free: number[]) {
    @disposeBy((val) => { free.push(val); })
    class Fixture extends XmlDisposable<Fixture> {
    }

    return Fixture;
}

describe('Disposable', () => {
    it('gc should release unused', async () => {
        const f1: number[] = [];

        const Fixture = fixture(f1);
        Fixture.getInstance(51);

        await new Promise((resolve) => { setTimeout(resolve, 0); });
        (global as any).gc();
        // allow finalizer to run
        await new Promise((resolve) => { setTimeout(resolve, 0); });

        expect(f1).to.deep.equal([51]);
    });

    it('disposed object should not be release again', async () => {
        const f1: number[] = [];

        {
            const Fixture = fixture(f1);
            const obj = Fixture.getInstance(41);
            obj.dispose();
        }

        // explict call to dispose already freed the resource and record it in f1 array, reset it.
        f1.length = 0;
        await new Promise((resolve) => { setTimeout(resolve, 0); });
        (global as any).gc();
        // allow finalizer to finish
        await new Promise((resolve) => { setTimeout(resolve, 0); });

        expect(f1).to.deep.equal([]);
    });

    it('creates instance only when needed', () => {
        const f1: number[] = [];
        const f2: number[] = [];
        const Fixture1 = fixture(f1);
        const Fixture2 = fixture(f2);

        const inst = Fixture1.getInstance(4);
        const inst2 = Fixture1.getInstance(4);
        const inst3 = Fixture1.getInstance(3);
        const inst4 = Fixture2.getInstance(4);

        expect(inst2).to.equal(inst); // same instance to inst
        expect(inst3).to.not.equal(inst); // different instance because ptr is different
        expect(inst4).to.not.equal(inst); // different instance because class is different
    });

    it('creates new instance after dispose', () => {
        const f1: number[] = [];
        const Fixture = fixture(f1);
        f1.length = 0;
        const inst1 = Fixture.getInstance(11);
        inst1.dispose();
        // inst1 is disposed (ptr 11 is free), verify it creates new instance
        const inst2 = Fixture.getInstance(11);

        expect(inst2).to.not.equal(inst1); // inst1 and inst2 are not same instance
        expect(f1).to.deep.equal([11]);
    });
});
