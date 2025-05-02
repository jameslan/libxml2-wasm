import { disposeBy, XmlDisposable } from './disposable.mjs';
import { XmlDocument } from './document.mjs';
import { xmlFreeDtd, xmlNewDtd, XmlTreeCommonStruct } from './libxml2.mjs';
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
     * Creates a new DTD.
     */
    static create(): XmlDtd {
        const ptr = xmlNewDtd();
        return XmlDtd.getInstance(ptr);
    }
}
