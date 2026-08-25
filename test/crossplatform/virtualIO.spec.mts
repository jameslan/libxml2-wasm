import { assert, expect } from 'chai';
import sinon from 'sinon';

import {
    ParseOption,
    XmlBufferInputProvider,
    xmlCleanupInputProvider,
    XmlDocument,
    XmlParseError,
    xmlRegisterInputProvider,
} from '@libxml2-wasm/lib/index.mjs';
// addFunction is an @internal export, stripped from the public .d.mts.
// eslint-disable-next-line import-x/no-namespace
import * as internal from '@libxml2-wasm/lib/libxml2.mjs';

const { addFunction } = internal as unknown as {
    addFunction: (func: () => number, sig: string) => number;
};

describe('Virtual IO', () => {
    afterEach(() => {
        xmlCleanupInputProvider();
    });

    it('should skip if not match', () => {
        xmlRegisterInputProvider({
            match(filename: string): boolean {
                expect(filename).to.equal('path/sub.xml');
                return false;
            },

            open(): number | undefined {
                assert.fail();
            },

            read(): number {
                assert.fail();
            },

            close(): boolean {
                assert.fail();
            },
        });

        expect(() => XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml">'
            + '</xi:include></doc>',
            { url: 'path/doc.xml', option: ParseOption.XML_PARSE_XINCLUDE },
        )).to.throw(
            XmlParseError,
            'failed to load "path/sub.xml": No such file or directory\n'
            + 'could not load path/sub.xml, and no fallback was found\n',
        ).with.deep.property('details', [{
            message: 'failed to load "path/sub.xml": No such file or directory\n',
            level: 1,
            line: 0,
            col: 0,
        }, {
            message: 'could not load path/sub.xml, and no fallback was found\n',
            level: 2,
            file: 'path/doc.xml',
            line: 1,
            col: 0,
            xpath: '/doc/xi:include',
        }]);
    });

    it('should skip if failed to open', () => {
        xmlRegisterInputProvider({
            match(filename: string): boolean {
                expect(filename).to.equal('path/sub.xml');
                return true;
            },

            open(filename: string): number | undefined {
                expect(filename).to.equal('path/sub.xml');
                return undefined;
            },

            read(): number {
                assert.fail();
            },

            close(): boolean {
                assert.fail();
            },
        });

        expect(() => XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml">'
            + '</xi:include></doc>',
            { url: 'path/doc.xml', option: ParseOption.XML_PARSE_XINCLUDE },
        )).to.throw(
            XmlParseError,
            'failed to load "path/sub.xml": No such file or directory\n'
            + 'could not load path/sub.xml, and no fallback was found\n',
        ).with.deep.property('details', [{
            message: 'failed to load "path/sub.xml": No such file or directory\n',
            level: 1,
            line: 0,
            col: 0,
        }, {
            message: 'could not load path/sub.xml, and no fallback was found\n',
            level: 2,
            file: 'path/doc.xml',
            line: 1,
            col: 0,
            xpath: '/doc/xi:include',
        }]);
    });

    it('should report error if failed to read', () => {
        xmlRegisterInputProvider({
            match(filename: string): boolean {
                expect(filename).to.equal('path/sub.xml');
                return true;
            },

            open(filename: string): number | undefined {
                expect(filename).to.equal('path/sub.xml');
                return 44;
            },

            read(fd: number): number {
                expect(fd).to.equal(44);
                return -1;
            },

            close(fd: number): boolean {
                expect(fd).to.equal(44);
                return true;
            },
        });

        expect(() => XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml">'
            + '</xi:include></doc>',
            { url: 'path/doc.xml', option: ParseOption.XML_PARSE_XINCLUDE },
        )).to.throw(
            XmlParseError,
            'Unknown IO error\n'
            + 'Document is empty\n'
            + 'could not load path/sub.xml, and no fallback was found\n',
        ).with.deep.property('details', [{
            message: 'Unknown IO error\n',
            level: 1,
            file: 'path/sub.xml',
            line: 1,
            col: 1,
        }, {
            message: 'Document is empty\n',
            level: 3,
            file: 'path/sub.xml',
            line: 1,
            col: 1,
        }, {
            message: 'could not load path/sub.xml, and no fallback was found\n',
            level: 2,
            file: 'path/doc.xml',
            line: 1,
            col: 0,
            xpath: '/doc/xi:include',
        }]);
    });

    it('should ignore error if failed to close', () => {
        const read = sinon.stub()
            .onFirstCall().callsFake(
                (fd: number, buf: Uint8Array) => new TextEncoder().encodeInto(
                    '<sub foo="bar"/>',
                    buf,
                ).read,
            )
            .onSecondCall()
            .returns(0);
        const close = sinon.stub()
            .returns(false);

        xmlRegisterInputProvider({
            match(filename: string): boolean {
                expect(filename).to.equal('path/sub.xml');
                return true;
            },

            open(filename: string): number | undefined {
                expect(filename).to.equal('path/sub.xml');
                return 44;
            },

            read,

            close,
        });

        using doc = XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude">'
            + '<xi:include href="sub.xml"></xi:include></doc>',
            { url: 'path/doc.xml' },
        );
        doc.processXInclude();

        expect(close.calledWith(44)).to.be.true;
    });
});

describe('Virtual IO resource management', () => {
    // addFunction hands out the next free function-table index, so probing it around an
    // operation shows how many entries that operation stranded.
    const probe = (): number => addFunction(() => 0, 'i');

    afterEach(() => {
        xmlCleanupInputProvider();
    });

    it('should reclaim wasm function-table entries on cleanup', () => {
        // Each register allocates four entries. Cleanup has to release them for reuse, which
        // takes more than one cycle to observe: a single freed entry is handed straight back
        // to the next probe. Over many cycles the index stays put, while a leak adds four
        // entries per cycle.
        const cycles = 20;

        const before = probe();
        for (let i = 0; i < cycles; i += 1) {
            xmlRegisterInputProvider(new XmlBufferInputProvider({}));
            xmlCleanupInputProvider();
        }
        const growth = probe() - before;

        expect(growth, `function table grew by ${growth} over ${cycles} register/cleanup cycles`)
            .to.be.at.most(8);
    });

    it('should refuse to register when libxml2 has no callback slot left', () => {
        // libxml2's input callback table has a fixed size, so registering without cleanup is
        // refused at some point. A refused registration must release the entries it allocated.
        const results: boolean[] = [];
        for (let i = 0; i < 16; i += 1) {
            results.push(xmlRegisterInputProvider(new XmlBufferInputProvider({})));
        }
        expect(results[0], 'the first registration should succeed').to.be.true;
        expect(results, 'registration should be refused once the table is full')
            .to.include(false);

        const refusals = 20;
        const before = probe();
        for (let i = 0; i < refusals; i += 1) {
            expect(xmlRegisterInputProvider(new XmlBufferInputProvider({}))).to.be.false;
        }
        const growth = probe() - before;
        expect(growth, `${refusals} refused registrations grew the table by ${growth}`)
            .to.be.at.most(8);

        xmlCleanupInputProvider();
        expect(xmlRegisterInputProvider(new XmlBufferInputProvider({})), 'cleanup frees the table')
            .to.be.true;
    });

    it('should release the provider and its buffers on cleanup', async () => {
        const settle = async (): Promise<void> => {
            for (let i = 0; i < 3; i += 1) {
                (global as any).gc();
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => {
                    setTimeout(resolve, 0);
                });
            }
        };

        const collectedAfter = async (
            act: (provider: XmlBufferInputProvider) => void,
        ): Promise<boolean> => {
            let provider: XmlBufferInputProvider | null = new XmlBufferInputProvider({
                'part.xml': new Uint8Array(1 << 20),
            });
            const ref = new WeakRef(provider);
            act(provider);
            provider = null;
            await settle();
            return ref.deref() === undefined;
        };

        // Control case: proves the WeakRef + gc probe really observes collection, so a
        // positive result below cannot be a false positive.
        expect(await collectedAfter(() => {}), 'unregistered provider should be collectible')
            .to.be.true;
        expect(
            await collectedAfter((provider) => {
                xmlRegisterInputProvider(provider);
                xmlCleanupInputProvider();
            }),
            'cleanup must release the provider and its buffers',
        ).to.be.true;
    });
});
