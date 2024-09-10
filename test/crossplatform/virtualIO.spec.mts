import {
    xmlCleanupInputProvider,
    XmlDocument,
    XmlParseError,
    xmlRegisterInputProvider,
} from '@libxml2-wasm/lib/index.mjs';
import { assert, expect } from 'chai';
import sinon from 'sinon';

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
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml"></xi:include></doc>',
            { url: 'path/doc.xml' },
        )).to.throw(
            XmlParseError,
            'failed to load "path/sub.xml": No such file or directory\ncould not load path/sub.xml, and no fallback was found\n',
        ).with.deep.property('details', [{
            message: 'failed to load "path/sub.xml": No such file or directory\n',
            line: 0,
            col: 0,
        }, {
            message: 'could not load path/sub.xml, and no fallback was found\n',
            file: 'path/doc.xml',
            line: 1,
            col: 0,
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
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml"></xi:include></doc>',
            { url: 'path/doc.xml' },
        )).to.throw(
            XmlParseError,
            'failed to load "path/sub.xml": No such file or directory\ncould not load path/sub.xml, and no fallback was found\n',
        ).with.deep.property('details', [{
            message: 'failed to load "path/sub.xml": No such file or directory\n',
            line: 0,
            col: 0,
        }, {
            message: 'could not load path/sub.xml, and no fallback was found\n',
            file: 'path/doc.xml',
            line: 1,
            col: 0,
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
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml"></xi:include></doc>',
            { url: 'path/doc.xml' },
        )).to.throw(
            XmlParseError,
            'Unknown IO error\nDocument is empty\ncould not load path/sub.xml, and no fallback was found\n',
        ).with.deep.property('details', [{
            message: 'Unknown IO error\n',
            file: 'path/sub.xml',
            line: 1,
            col: 1,
        }, {
            message: 'Document is empty\n',
            file: 'path/sub.xml',
            line: 1,
            col: 1,
        }, {
            message: 'could not load path/sub.xml, and no fallback was found\n',
            file: 'path/doc.xml',
            line: 1,
            col: 0,
        }]);
    });

    it('should ignore error if failed to close', () => {
        const read = sinon.stub()
            .onFirstCall().callsFake(
                (fd: number, buf: Uint8Array) => new TextEncoder().encodeInto('<sub foo="bar"/>', buf).read,
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

        XmlDocument.fromString(
            '<doc xmlns:xi="http://www.w3.org/2001/XInclude"><xi:include href="sub.xml"></xi:include></doc>',
            { url: 'path/doc.xml' },
        );

        expect(close.calledWith(44)).to.be.true;
    });
});
