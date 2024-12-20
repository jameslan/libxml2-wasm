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
import { disposeBy, XmlDisposable } from './disposable.mjs';

/**
 * The exception that is thrown when validating XML against a schema.
 */
export class XmlValidateError extends XmlLibError {
    static fromDetails(details: ErrorDetail[]): XmlValidateError {
        return new XmlValidateError(details.map((d) => d.message).join(''), details);
    }
}

export class DtdValidator {
}

/**
 * The RelaxNG schema validator.
 *
 * Note: This validator must be disposed explicitly.
 */
@disposeBy(xmlRelaxNGFree)
export class RelaxNGValidator extends XmlDisposable<RelaxNGValidator> {
    /**
     * Validate the XmlDocument.
     *
     * @param doc The XmlDocument to be validated.
     * @throws an {@link XmlValidateError} if the document is invalid;
     * @throws an {@link XmlError} or {@link XmlValidateError} if there’s an error,
     * such as validating a document that’s already disposed, etc.
     */
    validate(doc: XmlDocument): void {
        const ctxt = xmlRelaxNGNewValidCtxt(this._ptr);
        const errIndex = error.storage.allocate([]);
        xmlRelaxNGSetValidStructuredErrors(ctxt, error.errorCollector, errIndex);
        const ret = xmlRelaxNGValidateDoc(ctxt, doc._ptr);
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
     * Creates a RelaxNGValidator instance from an XmlDocument.
     * @param rng The XmlDocument representing the RelaxNG schema
     * @throws an {@link XmlError} or {@link XmlValidateError} if something goes wrong.
     */
    static fromDoc(rng: XmlDocument): RelaxNGValidator {
        // prepare parsing context for Relax NG
        const ctx = xmlRelaxNGNewDocParserCtxt(rng._ptr);
        if (ctx === 0) {
            throw new XmlError('Schema is null or failed to allocate memory');
        }
        const errIndex = error.storage.allocate([]);
        xmlRelaxNGSetParserStructuredErrors(ctx, error.errorCollector, errIndex);

        // parse relax NG validator from DOM
        const schema = xmlRelaxNGParse(ctx);

        // handle parsing errors and cleanup
        const errDetails = error.storage.get(errIndex);
        error.storage.free(errIndex);
        xmlRelaxNGFreeParserCtxt(ctx);
        if (schema === 0) {
            throw XmlValidateError.fromDetails(errDetails!);
        }

        // create Validator object
        return new RelaxNGValidator(schema);
    }
}

/**
 * The XSD schema validator.
 *
 * Note: This validator must to be disposed explicitly.
 */
@disposeBy(xmlSchemaFree)
export class XsdValidator extends XmlDisposable<XsdValidator> {
    /**
     * Validate the XmlDocument.
     *
     * @param doc The XmlDocument to be validated.
     * @throws an {@link XmlValidateError} if the document is invalid;
     * @throws an {@link XmlError} or {@link XmlValidateError} if there's an error,
     * such as validating a document that's already disposed, etc.
     */
    validate(doc: XmlDocument): void {
        const ctx = xmlSchemaNewValidCtxt(this._ptr);
        const errIndex = error.storage.allocate([]);
        xmlSchemaSetValidStructuredErrors(ctx, error.errorCollector, errIndex);
        const ret = xmlSchemaValidateDoc(ctx, doc._ptr);
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
     * Create an XsdValidator instance from an {@link XmlDocument} object.
     *
     * @param xsd The XSD schema, parsed in to an XmlDocument object.
     * @throws an {@link XmlError} or {@link XmlValidateError} if something goes wrong.
     */
    static fromDoc(xsd: XmlDocument): XsdValidator {
        // prepare parsing context for XSD
        const ctx = xmlSchemaNewDocParserCtxt(xsd._ptr);
        if (ctx === 0) {
            throw new XmlError('Schema is null or failed to allocate memory');
        }
        const errIndex = error.storage.allocate([]);
        xmlSchemaSetParserStructuredErrors(ctx, error.errorCollector, errIndex);

        // parse XSD validator from DOM
        const schema = xmlSchemaParse(ctx);

        // handle parsing errors and cleanup
        const errDetails = error.storage.get(errIndex);
        error.storage.free(errIndex);
        xmlSchemaFreeParserCtxt(ctx);
        if (schema === 0) {
            throw XmlValidateError.fromDetails(errDetails!);
        }

        // create Validator object
        return new XsdValidator(schema);
    }
}
