import { expect } from 'chai';
import { disposable, XmlDocument } from '@libxml2-wasm/lib/index.mjs';

describe('memDiag', () => {
    it('should report remaining objects', () => {
        disposable.memDiag({ enabled: true });
        const xml1 = XmlDocument.fromString('<doc/>');
        const xml2 = XmlDocument.fromString('<doc/>');

        xml1.dispose();
        const report = disposable.memReport();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(1);
        expect(report.XmlDocument.garbageCollected).to.equal(0);
        expect(report.XmlDocument.instances[0].instance).to.equal(xml2);
        xml2.dispose();
        disposable.memDiag({ enabled: false });
    });

    it('should report GC\'ed objects', async () => {
        disposable.memDiag({ enabled: true });
        const xml1 = XmlDocument.fromString('<doc/>');
        XmlDocument.fromString('<doc/>'); // to be GC'ed

        // allow finalizer to run
        await new Promise((resolve) => { setTimeout(resolve, 0); });
        (global as any).gc();
        const report = disposable.memReport();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(2);
        expect(report.XmlDocument.garbageCollected).to.equal(1);
        expect(report.XmlDocument.instances[0].instance).to.equal(xml1);
        xml1.dispose();
        disposable.memDiag({ enabled: false });
    });

    it('will not track allocation before enabled', () => {
        const xml1 = XmlDocument.fromString('<doc/>');
        disposable.memDiag({ enabled: true });
        const xml2 = XmlDocument.fromString('<doc/>');

        const report = disposable.memReport();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(1);
        expect(report.XmlDocument.garbageCollected).to.equal(0);
        expect(report.XmlDocument.instances[0].instance).to.equal(xml2);
        xml2.dispose();
        xml1.dispose();
        disposable.memDiag({ enabled: false });
    });
});
