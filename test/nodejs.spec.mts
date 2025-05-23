import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {
    ParseOption,
    xmlCleanupInputProvider,
    XmlDocument,
    XmlValidateError,
    XsdValidator,
} from '../lib/index.mjs';
import {
    fsInputProviders,
    saveDocSync,
    xmlRegisterFsInputProviders,
} from '../lib/nodejs.mjs';

chai.use(sinonChai);
const { expect } = chai;

describe('Node.js input callbacks', () => {
    before(() => {
        expect(xmlRegisterFsInputProviders()).to.be.true;
    });

    after(() => {
        xmlCleanupInputProvider();
    });

    it('handles includes with relative path', () => {
        using schemaDoc = XmlDocument.fromBuffer(fs.readFileSync('test/testfiles/book.xsd'), { url: 'test/testfiles/book.xsd' });
        using validator = XsdValidator.fromDoc(schemaDoc);
        using doc = XmlDocument.fromBuffer(
            fs.readFileSync('test/testfiles/book.xml'),
            { url: 'test/testfiles/book.xml', option: ParseOption.XML_PARSE_XINCLUDE },
        );
        validator.validate(doc);
    });

    it('handles includes with file url', () => {
        using schemaDoc = XmlDocument.fromBuffer(
            fs.readFileSync('test/testfiles/book.xsd'),
            { url: `file://${resolve('test/testfiles/book.xsd')}` },
        );
        using validator = XsdValidator.fromDoc(schemaDoc);
        using doc = XmlDocument.fromBuffer(
            fs.readFileSync('test/testfiles/book.xml'),
            { url: `file://${resolve('test/testfiles/book.xml')}`, option: ParseOption.XML_PARSE_XINCLUDE },
        );
        validator.validate(doc);
    });

    it('can read big file', () => {
        using doc = XmlDocument.fromBuffer(
            fs.readFileSync('test/testfiles/geography.xml'),
            { url: 'test/testfiles/geography.xml', option: ParseOption.XML_PARSE_XINCLUDE },
        );

        expect(doc.get('//country/capital[../name="United States"]')?.content).to.equal('Washington D.C.');
    });

    it('reports error conditions', () => {
        using wrongIncludeDoc = XmlDocument.fromBuffer(
            fs.readFileSync('test/testfiles/book_wronginclude.xsd'),
            { url: 'test/testfiles/book_wronginclude.xsd' },
        );
        expect(() => XsdValidator.fromDoc(wrongIncludeDoc)).to.throw(
            XmlValidateError,
            'failed to load "test/testfiles/wronginclude.xsd": No such file or directory\n'
            + 'Element \'{http://www.w3.org/2001/XMLSchema}include\': Failed to load the document \'test/testfiles/wronginclude.xsd\' for inclusion.\n',
        ).with.deep.property(
            'details',
            [{
                message: 'failed to load "test/testfiles/wronginclude.xsd": No such file or directory\n',
                line: 0,
                col: 0,
            }, {
                message: 'Element \'{http://www.w3.org/2001/XMLSchema}include\': Failed to load the document \'test/testfiles/wronginclude.xsd\' for inclusion.\n',
                file: 'test/testfiles/book_wronginclude.xsd',
                line: 3,
                col: 0,
            }],
        );
    });

    it('should skip http url', () => {
        expect(fsInputProviders.match('http://www.xml.org/')).to.be.false;
    });

    it('should skip non-exist file', () => {
        expect(fsInputProviders.match('test/testfiles/nonexist.xml')).to.be.false;
    });

    it('should not open http url', () => {
        expect(fsInputProviders.open('http://www.xml.org')).to.be.undefined;
    });

    it('handles error in opening file', () => {
        expect(fsInputProviders.open('test/testfiles/nonexist.xml')).to.be.undefined;
    });

    describe('with sinon stub', () => {
        let stub: sinon.SinonStub;
        afterEach(() => {
            stub.restore();
        });

        it('handles error in reading file', () => {
            stub = sinon.stub(fs, 'readSync');
            stub.throws('Error');

            expect(fsInputProviders.read(44, new Uint8Array())).to.equal(-1);
        });

        it('handles error in closing file', () => {
            stub = sinon.stub(fs, 'closeSync');
            stub.throws('Error');

            expect(fsInputProviders.close(44)).to.be.true;
        });
    });
});

describe('saveDocSync', () => {
    let writeStub: sinon.SinonStub;
    let closeStub: sinon.SinonStub;

    beforeEach(() => {
        writeStub = sinon.stub(fs, 'writeSync');
        closeStub = sinon.stub(fs, 'closeSync');
    });

    afterEach(() => {
        writeStub.restore();
        closeStub.restore();
    });

    it('writes to file', () => {
        const calledWithCorrectArg = writeStub.withArgs(
            42,
            sinon.match((value) => value instanceof Uint8Array && new TextDecoder().decode(value) === `\
<?xml version="1.0"?>
<docs>
  <doc/>
</docs>
`),
        );
        using doc = XmlDocument.fromString('<docs><doc></doc></docs>');
        saveDocSync(doc, 42);

        expect(calledWithCorrectArg).to.have.been.called;
        expect(closeStub).to.have.been.calledWith(42);
    });
});

describe('Initialization', () => {
    it('works when register io callbacks at the beginning', () => {
        // execute in external process to test the initialization
        execSync(`"${process.execPath}" test/initialization🚀.test.js`);
    });
});
