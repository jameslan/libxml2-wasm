import { XmlDocument } from './document.mjs';
import {
    XmlError,
    XmlErrorStruct,
    xmlGetLastError,
    xmlSchemaFree,
    xmlSchemaFreeParserCtxt,
    xmlSchemaFreeValidCtxt,
    xmlSchemaNewDocParserCtxt,
    xmlSchemaNewValidCtxt,
    xmlSchemaParse,
    xmlSchemaValidateDoc,
} from './libxml2.mjs';
import type { XmlSchemaPtr, XmlSchemaParserCtxtPtr } from './libxml2raw';
import { disposeBy, XmlDisposable } from './disposable.mjs';

export class XmlValidateError extends XmlError {}

export class DtdValidator {
}

export class RelaxNGValidator {
}

/**
 * XSD schema validator.
 *
 * NOTE: This validator needs to be disposed explicitly.
 */
export class XsdValidator extends XmlDisposable {
    @disposeBy(xmlSchemaFree)
    private accessor _schemaPtr: XmlSchemaPtr;

    constructor(ctx: XmlSchemaParserCtxtPtr) {
        super();
        this._schemaPtr = xmlSchemaParse(ctx);
        if (this._schemaPtr === 0) {
            const err = xmlGetLastError();
            throw new XmlError(XmlErrorStruct.message(err));
        }
    }

    /**
     * Validate the XmlDocument.
     *
     * @param doc the XmlDocument to be validated.
     * @throws {@link XmlValidateError} if the document is invalid;
     * @throws {@link XmlError} if something wrong,
     * such as validating a document already disposed, etc.
     */
    validate(doc: XmlDocument): void {
        const ctx = xmlSchemaNewValidCtxt(this._schemaPtr);
        const ret = xmlSchemaValidateDoc(ctx, doc._docPtr);
        xmlSchemaFreeValidCtxt(ctx);
        if (ret < 0) {
            throw new XmlError('Invalid input or internal error');
        }
        if (ret > 0) {
            const err = xmlGetLastError();
            throw new XmlValidateError(XmlErrorStruct.message(err));
        }
    }

    /**
     * Create an XsdValidator from an {@link XmlDocument} object.
     *
     * @param xsd The XSD schema, parsed in to an XmlDocument object.
     */
    static fromDoc(xsd: XmlDocument): XsdValidator {
        const ctx = xmlSchemaNewDocParserCtxt(xsd._docPtr);
        const validator = new XsdValidator(ctx);
        xmlSchemaFreeParserCtxt(ctx);
        return validator;
    }
}
