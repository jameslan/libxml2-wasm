import { XmlDocument } from './document.mjs';
import {
    XmlError,
    XmlErrorStruct,
    xmlGetLastError,
    xmlRelaxNGFree,
    xmlRelaxNGFreeParserCtxt,
    xmlRelaxNGFreeValidCtxt,
    xmlRelaxNGNewDocParserCtxt,
    xmlRelaxNGNewValidCtxt,
    xmlRelaxNGParse,
    xmlRelaxNGValidateDoc,
    xmlSchemaFree,
    xmlSchemaFreeParserCtxt,
    xmlSchemaFreeValidCtxt,
    xmlSchemaNewDocParserCtxt,
    xmlSchemaNewValidCtxt,
    xmlSchemaParse,
    xmlSchemaValidateDoc,
} from './libxml2.mjs';
import type {
    XmlRelaxNGParserCtxtPtr,
    XmlRelaxNGPtr,
    XmlSchemaParserCtxtPtr,
    XmlSchemaPtr,
} from './libxml2raw';
import { disposeBy, XmlDisposable } from './disposable.mjs';

export class XmlValidateError extends XmlError {}

export class DtdValidator {
}

export class RelaxNGValidator extends XmlDisposable {
    @disposeBy(xmlRelaxNGFree)
    private accessor _schemaPtr: XmlRelaxNGPtr;

    constructor(ctx: XmlRelaxNGParserCtxtPtr) {
        super();
        this._schemaPtr = xmlRelaxNGParse(ctx);
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
        const ctxt = xmlRelaxNGNewValidCtxt(this._schemaPtr);
        const ret = xmlRelaxNGValidateDoc(ctxt, doc._docPtr);
        xmlRelaxNGFreeValidCtxt(ctxt);

        if (ret < 0) {
            throw new XmlError('Invalid input or internal error');
        }
        if (ret > 0) {
            const err = xmlGetLastError();
            throw new XmlValidateError(XmlErrorStruct.message(err));
        }
    }

    /**
     * Create RelaxNGValidator from a byte buffer
     * @param rng The buffer of rng
     * @throws {@link XmlError} if something wrong.
     */
    static fromDoc(rng: XmlDocument): RelaxNGValidator {
        const ctx = xmlRelaxNGNewDocParserCtxt(rng._docPtr);
        if (ctx === 0) {
            throw new XmlError('Schema is null or failed to allocate memory');
        }
        const validator = new RelaxNGValidator(ctx);
        xmlRelaxNGFreeParserCtxt(ctx);
        return validator;
    }
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
     * @throws {@link XmlError} if something wrong.
     */
    static fromDoc(xsd: XmlDocument): XsdValidator {
        const ctx = xmlSchemaNewDocParserCtxt(xsd._docPtr);
        if (ctx === 0) {
            throw new XmlError('Schema is null or failed to allocate memory');
        }
        const validator = new XsdValidator(ctx);
        xmlSchemaFreeParserCtxt(ctx);
        return validator;
    }
}
