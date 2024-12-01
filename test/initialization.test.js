const fs = require('node:fs');

import('../lib/nodejs.mjs').then(({ xmlRegisterFsInputProviders }) => {
    import('../lib/index.mjs').then(({
        xmlCleanupInputProvider,
        XmlDocument,
        XsdValidator,
    }) => {
        xmlRegisterFsInputProviders();

        const schemaDoc = XmlDocument.fromBuffer(fs.readFileSync('test/testfiles/book.xsd'), { url: 'test/testfiles/book.xsd' });
        const validator = XsdValidator.fromDoc(schemaDoc);
        const doc = XmlDocument.fromBuffer(fs.readFileSync('test/testfiles/book.xml'), { url: 'test/testfiles/book.xml' });
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