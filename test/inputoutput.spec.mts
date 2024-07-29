import {
    openSync,
    readSync,
    closeSync,
} from 'fs';
import { expect } from 'chai';

import {
    XmlInputProvider,
    xmlRegisterInputProvider,
    xmlCleanupInputProvider,
    XmlDocument,
    XsdValidator,
} from '@libxml2-wasm/lib/index.mjs';

describe('Node.js input callbacks', () => {
    before(() => {
        const provider: XmlInputProvider<number> = {
            match: (filename: string) => {
                if (filename.endsWith('.xsd') || filename.endsWith('.xml')) {
                    return true;
                }
                return false;
            },
            open: (filename: string) => {
                try {
                    return openSync(filename, 'r');
                } catch {
                    return undefined;
                }
            },
            read: (fd: number, buf: Uint8Array) => {
                try {
                    return readSync(fd, buf, 0, buf.byteLength, null);
                } catch {
                    return -1;
                }
            },
            close: (fd: number) => {
                try {
                    closeSync(fd);
                    return true;
                } catch {
                    return false;
                }
            },
        };
        expect(xmlRegisterInputProvider(provider)).to.be.true;
    });

    after(() => {
        xmlCleanupInputProvider();
    });

    it('should be able to handle includes when files are read', () => {
        const schemaDoc = XmlDocument.fromFile('test/testfiles/book.xsd');
        const validator = XsdValidator.fromDoc(schemaDoc);
        validator.dispose();
        schemaDoc.dispose();
    });

    it('should be able to report error conditions', () => {
        // match shall return false
        expect(() => XmlDocument.fromFile('test/testfiles/shouldnotmatch.xyz')).to.throw();
        // open shall file
        expect(() => XmlDocument.fromFile('test/testfiles/nonexistingfile.xsd')).to.throw();
        // open succeeds, but include shall fail
        const wrongIncludeDoc = XmlDocument.fromFile('test/testfiles/book_wronginclude.xsd');
        expect(() => XsdValidator.fromDoc(wrongIncludeDoc)).to.throw();
        wrongIncludeDoc.dispose();
    });
});
