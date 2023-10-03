// @ts-ignore
import {
    XmlError, xmlDocGetRootElement, xmlFreeDoc, xmlNewDoc,
} from './libxml2.mjs';
import { XmlElement, XmlNode } from './nodes.mjs';

export default class XmlDocument {
    /** @internal */
    _docPtr: number;

    /** Create a new document.
     * To parse an existing xml, use {@link parseXmlString}.
    */
    constructor();
    /** Create a document object wrapping document parsed by libxml2.
     * @see {@link parseXmlString}
     * @internal
     */
    constructor(xmlDocPtr: number);
    constructor(xmlDocPtr?: number) {
        this._docPtr = xmlDocPtr ?? xmlNewDoc();
    }

    /**
     * Dispose the XmlDocument as well as its underlying libxml2 data.
     *
     * This needs to be called explicitly to avoid resource leak.
     */
    dispose() {
        xmlFreeDoc(this._docPtr);
    }

    /**
     * Find the first descendant node of root element matching the given xpath selector,
     * @param xpath XPath selector
     * @returns null if not found, otherwise an instance of {@link XmlNode}'s subclass.
     * @see {@link XmlNode#get | XmlNode.get}
     */
    get(xpath: string): XmlNode | null {
        return this.root.get(xpath);
    }

    /**
     * The root element of the document.
     * If the document is newly created and not yet set up a root,
     * {@link XmlError} will be thrown.
     */
    get root(): XmlElement {
        const root = xmlDocGetRootElement(this._docPtr);
        if (!root) {
            // TODO: get error information from libxml2
            throw new XmlError();
        }
        return new XmlElement(this, root);
    }
}
