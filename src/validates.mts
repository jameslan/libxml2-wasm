import { XmlDocument } from './document.mjs';
import {
    error,
    ErrorDetail,
    XmlError,
    XmlLibError,
    xmlRelaxNGFree,
    xmlRelaxNGFreeParserCtxt,
    xmlRelaxNGFreeValidCtxt,
    xmlRelaxNGNewDocParserCtxt,
    xmlRelaxNGNewValidCtxt,
    xmlRelaxNGParse,
    xmlRelaxNGSetParserStructuredErrors,
    xmlRelaxNGSetValidStructuredErrors,
    xmlRelaxNGValidateDoc,
    xmlSchemaFree,
    xmlSchemaFreeParserCtxt,
    xmlSchemaFreeValidCtxt,
    xmlSchemaNewDocParserCtxt,
    xmlSchemaNewValidCtxt,
    xmlSchemaParse,
    xmlSchemaSetParserStructuredErrors,
    xmlSchemaSetValidStructuredErrors,
    xmlSchemaValidateDoc,
} from './libxml2.mjs';
import type {
    XmlRelaxNGParserCtxtPtr,
    XmlRelaxNGPtr,
    XmlSchemaParserCtxtPtr,
    XmlSchemaPtr,
} from './libxml2raw.cjs';
import { disposeBy, XmlDisposable } from './disposable.mjs';

/**
 * Exception thrown during validating XML using a XSD schema.
 */
export class XmlValidateError extends XmlLibError {
    static fromDetails(details: ErrorDetail[]): XmlValidateError {
        return new XmlValidateError(details.map((d) => d.message).join(''), details);
    }
}

export class DtdValidator {
}

/**
 * RelaxNG schema validator.
 *
 * NOTE: This validator needs to be disposed explicitly.
 */
export class RelaxNGValidator extends XmlDisposable {
    @disposeBy(xmlRelaxNGFree)
    private accessor _schemaPtr: XmlRelaxNGPtr;

    private constructor(ctx: XmlRelaxNGParserCtxtPtr) {
        super();
        const errIndex = error.storage.allocate();
        xmlRelaxNGSetParserStructuredErrors(ctx, error.errorCollector, errIndex);
        this._schemaPtr = xmlRelaxNGParse(ctx);
        const errDetails = error.storage.get(errIndex);
        error.storage.free(errIndex);
        if (this._schemaPtr === 0) {
            throw XmlValidateError.fromDetails(errDetails!);
        }
    }

    /**
     * Validate the XmlDocument.
     *
     * @param doc the XmlDocument to be validated.
     * @throws {@link XmlValidateError} if the document is invalid;
     * @throws {@link XmlError} or {@link XmlValidateError} if something wrong,
     * such as validating a document already disposed, etc.
     */
    validate(doc: XmlDocument): void {
        const ctxt = xmlRelaxNGNewValidCtxt(this._schemaPtr);
        const errIndex = error.storage.allocate();
        xmlRelaxNGSetValidStructuredErrors(ctxt, error.errorCollector, errIndex);
        const ret = xmlRelaxNGValidateDoc(ctxt, doc._docPtr);
        const errDetails = error.storage.get(errIndex);
        error.storage.free(errIndex);
        xmlRelaxNGFreeValidCtxt(ctxt);

        if (ret < 0) {
            throw new XmlError('Invalid input or internal error');
        }
        if (ret > 0) {
            throw XmlValidateError.fromDetails(errDetails!);
        }
    }

    /**
     * Create RelaxNGValidator from a byte buffer
     * @param rng The buffer of rng
     * @throws {@link XmlError} or {@link XmlValidateError} if something wrong.
     */
    static fromDoc(rng: XmlDocument): RelaxNGValidator {
        const ctx = xmlRelaxNGNewDocParserCtxt(rng._docPtr);
        if (ctx === 0) {
            throw new XmlError('Schema is null or failed to allocate memory');
        }
        try {
            return new RelaxNGValidator(ctx);
        } finally {
            xmlRelaxNGFreeParserCtxt(ctx);
        }
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

    private constructor(ctx: XmlSchemaParserCtxtPtr) {
        super();
        const errIndex = error.storage.allocate();
        xmlSchemaSetParserStructuredErrors(ctx, error.errorCollector, errIndex);
        this._schemaPtr = xmlSchemaParse(ctx);
        const errDetails = error.storage.get(errIndex);
        error.storage.free(errIndex);
        if (this._schemaPtr === 0) {
            throw XmlValidateError.fromDetails(errDetails!);
        }
    }

    /**
     * Validate the XmlDocument.
     *
     * @param doc the XmlDocument to be validated.
     * @throws {@link XmlValidateError} if the document is invalid;
     * @throws {@link XmlError} or {@link XmlValidateError} if something wrong,
     * such as validating a document already disposed, etc.
     */
    validate(doc: XmlDocument): void {
        const ctx = xmlSchemaNewValidCtxt(this._schemaPtr);
        const errIndex = error.storage.allocate();
        xmlSchemaSetValidStructuredErrors(ctx, error.errorCollector, errIndex);
        const ret = xmlSchemaValidateDoc(ctx, doc._docPtr);
        const errDetails = error.storage.get(errIndex);
        error.storage.free(errIndex);
        xmlSchemaFreeValidCtxt(ctx);
        if (ret < 0) {
            throw new XmlError('Invalid input or internal error');
        }
        if (ret > 0) {
            throw XmlValidateError.fromDetails(errDetails!);
        }
    }

    /**
     * Create an XsdValidator from an {@link XmlDocument} object.
     *
     * @param xsd The XSD schema, parsed in to an XmlDocument object.
     * @throws {@link XmlError} or {@link XmlValidateError} if something wrong.
     */
    static fromDoc(xsd: XmlDocument): XsdValidator {
        const ctx = xmlSchemaNewDocParserCtxt(xsd._docPtr);
        if (ctx === 0) {
            throw new XmlError('Schema is null or failed to allocate memory');
        }
        try {
            return new XsdValidator(ctx);
        } finally {
            xmlSchemaFreeParserCtxt(ctx);
        }
    }
}
