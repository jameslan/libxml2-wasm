import { disposeBy, XmlDisposable } from './disposable.mjs';
import { XmlDocument } from './document.mjs';
import {
  XmlTreeCommonStruct,
  xmlCtxtParseDtd,
  xmlFreeParserCtxt,
  xmlFreeDtd,
  xmlNewInputFromMemory,
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
        const input = xmlNewInputFromMemory(null, buffer, 1);
        const ptr = xmlCtxtParseDtd(
            parserCtxt,
            input,
            null,
            null,
        );
        xmlFreeParserCtxt(parserCtxt);
        return XmlDtd.getInstance(ptr);
    }

    /**
     * Parse a DTD from a string.
     */
    static fromString(str: string): XmlDtd {
        return this.fromBuffer(new TextEncoder().encode(str));
    }
}
