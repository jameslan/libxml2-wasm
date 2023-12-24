import {
    XmlError, xmlDocGetRootElement, xmlFreeDoc, xmlNewDoc,
} from './libxml2.mjs';
import { XmlElement, XmlNode } from './nodes.mjs';
import { XmlXPath, NamespaceMap } from './xpath.mjs';

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

    get(xpath: XmlXPath): XmlNode | null;
    get(xpath: string, namespaces?: NamespaceMap): XmlNode | null;
    /**
     * Find the first descendant node of root element matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and uri, used in the XPath
     * @returns null if not found, otherwise an instance of {@link XmlNode}'s subclass.
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link find}
     */
    get(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode | null {
        return this.root.get(xpath, namespaces);
    }

    find(xpath: XmlXPath): XmlNode[];
    find(xpath: string, namespaces?: NamespaceMap): XmlNode[];
    /**
     * Find all the descendant nodes of root element matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and uri, used in the XPath
     * @returns Empty array if invalid xpath or not found any node.
     * @see
     *  - {@link XmlNode#find | XmlNode.find}
     *  - {@link get}
     */
    find(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode[] {
        return this.root.find(xpath, namespaces);
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
