import { disposeBy, XmlDisposable } from './disposable.mjs';
import { XmlParseError, XmlDocument } from './document.mjs';
import {
  XmlTreeCommonStruct,
  error,
  xmlCtxtParseDtd,
  xmlCtxtSetErrorHandler,
  xmlFreeParserCtxt,
  xmlFreeDtd,
  xmlNewParserCtxt,
} from './libxml2.mjs';
import { XmlDtdPtr } from './libxml2raw.mjs';

function freeDtd(ptr: XmlDtdPtr): void {
    if (XmlTreeCommonStruct.parent(ptr) !== 0) {
        // owned by a document, do not free
        return;
    }
    xmlFreeDtd(ptr);
}

/**
 * Represents a Document Type Definition (DTD) in XML.
 *
 * If the DTD is not owned by a document, {@link XmlDtd#dispose} needs to be called to free the DTD.
 */
@disposeBy(freeDtd)
export class XmlDtd extends XmlDisposable<XmlDtd> {
    /**
     * The owner document of this DTD.
     *
     * If the DTD is not owned by a document, this will be `null`.
     */
    get doc(): XmlDocument | null {
        const docPtr = XmlTreeCommonStruct.doc(this._ptr);
        return docPtr ? XmlDocument.getInstance(docPtr) : null;
    }

    /**
     * Parse a DTD from a buffer.
     */
    static fromBuffer(buffer: Uint8Array): XmlDtd {
        const parserCtxt = xmlNewParserCtxt();
        const errIndex = error.storage.allocate([]);
        xmlCtxtSetErrorHandler(parserCtxt, error.errorCollector, errIndex);
        const ptr = xmlCtxtParseDtd(
            parserCtxt,
            buffer,
            null,
            null,
        );
        const errDetails = error.storage.get(errIndex);
        error.storage.free(errIndex);
        xmlFreeParserCtxt(parserCtxt);
        if (!ptr) {
            throw new XmlParseError(errDetails!.map((d) => d.message).join(''), errDetails!);
        }
        return XmlDtd.getInstance(ptr);
    }

    /**
     * Parse a DTD from a string.
     */
    static fromString(str: string): XmlDtd {
        return this.fromBuffer(new TextEncoder().encode(str));
    }
}
