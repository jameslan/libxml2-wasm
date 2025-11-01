const fs = require('node:fs');

const libPath = fs.existsSync('./lib/index.mjs')
    ? '../..'
    : '../../node_modules/libxml2-wasm';

import(`${libPath}/lib/nodejs.mjs`).then(({ xmlRegisterFsInputProviders }) => {
    import(`${libPath}/lib/index.mjs`).then(({
        ParseOption,
        xmlCleanupInputProvider,
        XmlDocument,
        XsdValidator,
    }) => {
        xmlRegisterFsInputProviders();

        const schemaDoc = XmlDocument.fromBuffer(fs.readFileSync('test/testfiles/book.xsd'), { url: 'test/testfiles/book.xsd' });
        const validator = XsdValidator.fromDoc(schemaDoc);
        const doc = XmlDocument.fromBuffer(
            fs.readFileSync('test/testfiles/book.xml'),
            { url: 'test/testfiles/book.xml', option: ParseOption.XML_PARSE_XINCLUDE },
        );
        try {
            validator.validate(doc);
        } finally {
            doc.dispose();
            validator.dispose();
            schemaDoc.dispose();
            xmlCleanupInputProvider();
        }
    });
});
