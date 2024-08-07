import { expect } from 'chai';
import { diag, XmlDocument } from '@libxml2-wasm/lib/index.mjs';

describe('diagnostics', () => {
    it('should report remaining objects', () => {
        diag.configure({ enabled: true });
        const xml1 = XmlDocument.fromString('<doc/>');
        const xml2 = XmlDocument.fromString('<doc/>');

        xml1.dispose();
        const report = diag.report();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(1);
        expect(report.XmlDocument.garbageCollected).to.equal(0);
        expect(report.XmlDocument.instances[0].instance).to.equal(xml2);
        expect(report.XmlDocument.instances[0].caller).to.be.undefined;
        expect(report.XmlDocument.callers).to.be.undefined;
        xml2.dispose();
        diag.configure({ enabled: false });
    });

    it('should report caller detail', () => {
        diag.configure({ enabled: true, callerDetail: true });
        const xml = XmlDocument.fromString('<doc/>');
        const report = diag.report();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(1);
        expect(report.XmlDocument.garbageCollected).to.equal(0);
        expect(report.XmlDocument.instances[0].instance).to.equal(xml);
        expect(report.XmlDocument.instances[0].caller).to.be.a('string');
        expect(report.XmlDocument.callers).to.be.undefined;
        xml.dispose();
        diag.configure({ enabled: false });
    });

    it('should report caller stats', () => {
        diag.configure({ enabled: true, callerStats: true });
        const xml = XmlDocument.fromString('<doc/>');
        const report = diag.report();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(1);
        expect(report.XmlDocument.garbageCollected).to.equal(0);
        expect(report.XmlDocument.instances[0].instance).to.equal(xml);
        expect(report.XmlDocument.instances[0].caller).to.be.undefined;
        expect(Object.values(report.XmlDocument.callers)).to.deep.equal([1]);
        xml.dispose();
        diag.configure({ enabled: false });
    });

    it('could report caller stat for GC\'ed instance', async () => {
        diag.configure({ enabled: true, callerStats: true });
        XmlDocument.fromString('<doc/>'); // to be GC'ed

        // allow finalizer to run
        await new Promise((resolve) => { setTimeout(resolve, 0); });
        (global as any).gc();
        const report = diag.report();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(1);
        expect(report.XmlDocument.garbageCollected).to.equal(1);
        expect(report.XmlDocument.instances).to.deep.equal([]);
        expect(Object.values(report.XmlDocument.callers)).to.deep.equal([1]);
        diag.configure({ enabled: false });
    });

    it('should report GC\'ed objects', async () => {
        diag.configure({ enabled: true });
        const xml1 = XmlDocument.fromString('<doc/>');
        XmlDocument.fromString('<doc/>'); // to be GC'ed

        // allow finalizer to run
        await new Promise((resolve) => { setTimeout(resolve, 0); });
        (global as any).gc();
        const report = diag.report();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(2);
        expect(report.XmlDocument.garbageCollected).to.equal(1);
        expect(report.XmlDocument.instances[0].instance).to.equal(xml1);
        xml1.dispose();
        diag.configure({ enabled: false });
    });

    it('will not track allocation before enabled', () => {
        const xml1 = XmlDocument.fromString('<doc/>');
        diag.configure({ enabled: true });
        const xml2 = XmlDocument.fromString('<doc/>');

        const report = diag.report();

        expect(report.XmlDocument).is.not.null;
        expect(report.XmlDocument.totalInstances).to.equal(1);
        expect(report.XmlDocument.garbageCollected).to.equal(0);
        expect(report.XmlDocument.instances[0].instance).to.equal(xml2);
        xml2.dispose();
        xml1.dispose();
        diag.configure({ enabled: false });
    });
});
