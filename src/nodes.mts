import {
    xmlAddChild,
    xmlAddNextSibling,
    xmlAddPrevSibling,
    XmlError,
    xmlFreeNode,
    xmlGetNsList,
    xmlHasNsProp,
    XmlNamedNodeStruct,
    xmlNewCDataBlock,
    xmlNewDocComment,
    xmlNewDocText,
    xmlNewNs,
    xmlNodeGetContent,
    xmlNodeSetContent,
    XmlNodeSetStruct,
    XmlNodeStruct,
    XmlNsStruct,
    xmlRemoveProp,
    xmlSearchNs,
    xmlSetNs,
    xmlSetNsProp,
    xmlUnlinkNode,
    xmlXPathCompiledEval,
    xmlXPathFreeContext,
    xmlXPathFreeObject,
    xmlXPathNewContext,
    XmlXPathObjectStruct,
    xmlXPathRegisterNs,
    xmlXPathSetContextNode,
} from './libxml2.mjs';
import { XmlDocument } from './document.mjs';
import type { XmlNodePtr } from './libxml2raw.cjs';
import { XmlXPath, NamespaceMap } from './xpath.mjs';

function compiledXPathEval(nodePtr: XmlNodePtr, xpath: XmlXPath) {
    const context = xmlXPathNewContext(XmlNodeStruct.doc(nodePtr));
    if (xpath.namespaces) {
        Object.entries(xpath.namespaces)
            .forEach(([prefix, uri]) => {
                xmlXPathRegisterNs(context, prefix, uri);
            });
    }
    xmlXPathSetContextNode(nodePtr, context);
    const xpathObj = xmlXPathCompiledEval(xpath._ptr, context);
    xmlXPathFreeContext(context);
    return xpathObj;
}

function xpathEval(nodePtr: XmlNodePtr, xpath: string | XmlXPath, namespaces?: NamespaceMap) {
    const xpathCompiled = xpath instanceof XmlXPath
        ? xpath
        : XmlXPath.create(xpath, namespaces);
    const ret = compiledXPathEval(nodePtr, xpathCompiled);
    if (!(xpath instanceof XmlXPath)) {
        xpathCompiled.dispose();
    }
    return ret;
}

function createNode(nodePtr: XmlNodePtr): XmlNode {
    const nodeType = XmlNodeStruct.type(nodePtr);
    switch (nodeType) {
        case XmlNodeStruct.Type.XML_ELEMENT_NODE:
            return new XmlElement(nodePtr);
        case XmlNodeStruct.Type.XML_ATTRIBUTE_NODE:
            return new XmlAttribute(nodePtr);
        case XmlNodeStruct.Type.XML_TEXT_NODE:
            return new XmlText(nodePtr);
        case XmlNodeStruct.Type.XML_COMMENT_NODE:
            return new XmlComment(nodePtr);
        case XmlNodeStruct.Type.XML_CDATA_SECTION_NODE:
            return new XmlCData(nodePtr);
        default:
            throw new XmlError(`Unsupported node type ${nodeType}`);
    }
}

function createNullableNode(nodePtr: XmlNodePtr): XmlNode | null {
    return nodePtr ? createNode(nodePtr) : null;
}

export abstract class XmlNode {
    /** @internal */
    _nodePtr: XmlNodePtr;

    /** @internal */
    constructor(nodePtr: XmlNodePtr) {
        this._nodePtr = nodePtr;
    }

    /**
     * The {@link XmlDocument} containing this node.
     */
    get doc(): XmlDocument {
        return XmlDocument.getInstance(XmlNodeStruct.doc(this._nodePtr));
    }

    /**
     * Remove the node from its parent.
     */
    remove(): void {
        if (!this._nodePtr) {
            return;
        }
        xmlUnlinkNode(this._nodePtr);
        xmlFreeNode(this._nodePtr);
        this._nodePtr = 0;
    }

    /**
     * Add a comment sibling node after this node.
     *
     * @param content the content of the comment
     *
     * @see {@link prependComment}
     * @see {@link XmlElement#addComment}
     */
    appendComment(content: string): XmlComment {
        let node = xmlNewDocComment(XmlNodeStruct.doc(this._nodePtr), content);
        node = xmlAddNextSibling(this._nodePtr, node);
        return new XmlComment(node);
    }

    /**
     * Add a comment sibling node before this node.
     * @param content the content of the comment
     *
     * @see {@link appendComment}
     * @see {@link XmlElement#addComment}
     */
    prependComment(content: string): XmlComment {
        let node = xmlNewDocComment(XmlNodeStruct.doc(this._nodePtr), content);
        node = xmlAddPrevSibling(this._nodePtr, node);
        return new XmlComment(node);
    }

    /**
     * Add a CDATA section sibling node after this node.
     * @param content the content of the CDATA section
     *
     * @see {@link prependCData}
     * @see {@link XmlElement#addCData}
     */
    appendCData(content: string): XmlCData {
        let node = xmlNewCDataBlock(XmlNodeStruct.doc(this._nodePtr), content);
        node = xmlAddNextSibling(this._nodePtr, node);
        return new XmlCData(node);
    }

    /**
     * Add a CDATA section sibling node before this node.
     * @param content the content of the CDATA section
     *
     * @see {@link appendCData}
     * @see {@link XmlElement#addCData}
     */
    prependCData(content: string): XmlCData {
        let node = xmlNewCDataBlock(XmlNodeStruct.doc(this._nodePtr), content);
        node = xmlAddPrevSibling(this._nodePtr, node);
        return new XmlCData(node);
    }

    /**
     * Add a text sibling node after this node.
     * @param text the content of the text node
     *
     * @see {@link prependText}
     * @see {@link XmlElement#addText}
     */
    appendText(text: string): XmlText {
        let node = xmlNewDocText(XmlNodeStruct.doc(this._nodePtr), text);
        node = xmlAddNextSibling(this._nodePtr, node);
        return new XmlText(node);
    }

    /**
     * Add a text sibling node before this node.
     * @param text the content of the text node
     *
     * @see {@link appendText}
     * @see {@link XmlElement#addText}
     */
    prependText(text: string): XmlText {
        let node = xmlNewDocText(XmlNodeStruct.doc(this._nodePtr), text);
        node = xmlAddPrevSibling(this._nodePtr, node);
        return new XmlText(node);
    }

    /**
     * The parent node of this node.
     *
     * For root node, it's parent is null.
     */
    get parent(): XmlNode | null { // TODO: should it return XmlElement?
        const parent = XmlNodeStruct.parent(this._nodePtr);
        if (!parent || parent === XmlNodeStruct.doc(this._nodePtr)) {
            return null;
        }
        return createNode(parent);
    }

    /**
     * The node of first child.
     *
     * Note that children of an element won't include attributes
     *
     * Return null if this node has no child
     *
     * @see
     *  - {@link lastChild}
     *  - {@link next}
     *  - {@link prev}
     */
    get firstChild(): XmlNode | null {
        const child = XmlNodeStruct.children(this._nodePtr);
        return createNullableNode(child);
    }

    /**
     * The node of last child.
     *
     * Note that children of an element won't include attributes
     *
     * Return null if this node has no child
     *
     * @see
     *  - {@link firstChild}
     *  - {@link next}
     *  - {@link prev}
     */
    get lastChild(): XmlNode | null {
        const child = XmlNodeStruct.last(this._nodePtr);
        return createNullableNode(child);
    }

    /**
     * The node of next sibling.
     *
     * Return null if this node is the last one.
     *
     * @see
     *  - {@link firstChild}
     *  - {@link lastChild}
     *  - {@link prev}
     */
    get next(): XmlNode | null {
        const child = XmlNodeStruct.next(this._nodePtr);
        return createNullableNode(child);
    }

    /**
     * The node of previous sibling.
     *
     * Return null if this node is the first one.
     *
     * @see
     *  - {@link firstChild}
     *  - {@link lastChild}
     *  - {@link next}
     */
    get prev(): XmlNode | null {
        const child = XmlNodeStruct.prev(this._nodePtr);
        return createNullableNode(child);
    }

    /**
     * The content string of the node.
     */
    get content(): string {
        return xmlNodeGetContent(this._nodePtr);
    }

    /**
     * The line number of the node.
     */
    get line(): number {
        return XmlNodeStruct.line(this._nodePtr);
    }

    /**
     * Namespace definitions on this node, including inherited
     */
    get namespaces(): NamespaceMap {
        return xmlGetNsList(XmlNodeStruct.doc(this._nodePtr), this._nodePtr).reduce(
            // convert to object
            (prev, curr) => ({ ...prev, [XmlNsStruct.prefix(curr)]: XmlNsStruct.href(curr) }),
            {},
        );
    }

    /**
     * Find out corresponding namespace uri of a prefix
     * @param prefix
     */
    namespaceForPrefix(prefix: string): string | null {
        const ns = xmlSearchNs(XmlNodeStruct.doc(this._nodePtr), this._nodePtr, prefix);
        return ns ? XmlNsStruct.href(ns) : null;
    }

    get(xpath: XmlXPath): XmlNode | null;
    get(xpath: string, namespaces?: NamespaceMap): XmlNode | null;
    get(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode | null;
    /**
     * Find the first descendant node matching the given xpath selector
     *
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and uri, used in the XPath
     * @returns null if not found, otherwise an instance of {@link XmlNode}'s subclass.
     * @see
     *  - {@link get}
     */
    get(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode | null {
        const xpathObj = xpathEval(this._nodePtr, xpath, namespaces);
        if (!xpathObj) {
            return null;
        }
        let ret: XmlNode | null;
        if (XmlXPathObjectStruct.type(xpathObj) !== XmlXPathObjectStruct.Type.XPATH_NODESET) {
            ret = null;
        } else {
            const nodeSet = XmlXPathObjectStruct.nodesetval(xpathObj);
            if (nodeSet === 0 || XmlNodeSetStruct.nodeCount(nodeSet) === 0) {
                ret = null;
            } else {
                ret = createNode(XmlNodeSetStruct.nodeTable(nodeSet, 1)[0]);
            }
        }
        xmlXPathFreeObject(xpathObj);
        return ret;
    }

    find(xpath: XmlXPath): XmlNode[];
    find(xpath: string, namespaces?: NamespaceMap): XmlNode[];
    find(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode[];
    /**
     * Find all the descendant nodes matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and uri, used in the XPath
     * @returns Empty array if invalid xpath or not found any node.
     * @see
     *  - {@link get}
     */
    find(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode[] {
        const xpathObj = xpathEval(this._nodePtr, xpath, namespaces);
        if (!xpathObj) {
            return [];
        }

        const nodes: XmlNode[] = [];

        if (XmlXPathObjectStruct.type(xpathObj) === XmlXPathObjectStruct.Type.XPATH_NODESET) {
            const nodeSet = XmlXPathObjectStruct.nodesetval(xpathObj);
            const nodeCount = XmlNodeSetStruct.nodeCount(nodeSet);
            const nodeTable = XmlNodeSetStruct.nodeTable(nodeSet, nodeCount);
            for (let i = 0; i < nodeCount; i += 1) {
                nodes.push(createNode(nodeTable[i]));
            }
        }

        xmlXPathFreeObject(xpathObj);
        return nodes;
    }
}

class XmlNamedNode extends XmlNode {
    /**
     * The name of this node.
     */
    get name(): string {
        return XmlNodeStruct.name_(this._nodePtr);
    }

    /**
     * The URI of the namespace applied to this node.
     */
    get namespaceUri(): string {
        const namespace = XmlNamedNodeStruct.namespace(this._nodePtr);
        if (namespace) {
            return XmlNsStruct.href(namespace);
        }
        return '';
    }

    /**
     * The prefix representing the namespace applied to this node.
     */
    get namespacePrefix(): string {
        const namespace = XmlNamedNodeStruct.namespace(this._nodePtr);
        if (namespace) {
            return XmlNsStruct.prefix(namespace);
        }
        return '';
    }

    /**
     * Set the namespace prefix of this node.
     * @param prefix The new prefix to set.
     * Use empty string to set to default namespace,
     * or to remove the prefix (if no default namespace declared).
     */
    set namespacePrefix(prefix: string) {
        // Check if the namespace prefix valid for the current node
        const ns = xmlSearchNs(XmlNodeStruct.doc(this._nodePtr), this._nodePtr, prefix || null);
        if (!ns && prefix) {
            throw new XmlError(`Namespace prefix "${prefix}" not found`);
        }
        xmlSetNs(this._nodePtr, ns);
    }
}

export class XmlElement extends XmlNamedNode {
    /**
     * All attributes of this element.
     */
    get attrs(): XmlAttribute[] {
        const attrs: XmlAttribute[] = [];
        for (
            let attr = XmlNodeStruct.properties(this._nodePtr);
            attr;
            attr = XmlNodeStruct.next(attr)
        ) {
            attrs.push(new XmlAttribute(attr));
        }

        return attrs;
    }

    /**
     * Namespace declaration on this element
     *
     * @returns Empty object if there's no local namespace definition on this element.
     * Note that default namespace uses empty string as key.
     */
    get localNamespaces(): NamespaceMap {
        const namespaces: NamespaceMap = {};
        for (let ns = XmlNodeStruct.nsDef(this._nodePtr); ns; ns = XmlNsStruct.next(ns)) {
            namespaces[XmlNsStruct.prefix(ns)] = XmlNsStruct.href(ns);
        }
        return namespaces;
    }

    /**
     * Add a namespace declaration to this element.
     * @param uri The namespace URI.
     * @param prefix The prefix that the namespace to be used as.
     * If not provided, it will be treated as default namespace.
     *
     * @throws XmlError if namespace declaration already exists.
     */
    addLocalNamespace(uri: string, prefix?: string): void {
        const namespace = xmlNewNs(this._nodePtr, uri, prefix);
        if (!namespace) {
            throw new XmlError(`Failed to add namespace declaration "${prefix}"`);
        }
    }

    /**
     * Get the attribute of this element.
     * Return null if the attribute doesn't exist.
     * @param name The name of the attribute
     * @param prefix The namespace prefix to the attribute.
     */
    attr(name: string, prefix?: string): XmlAttribute | null {
        const namespace = prefix ? this.namespaceForPrefix(prefix) : null;
        const attrPtr = xmlHasNsProp(this._nodePtr, name, namespace);
        if (!attrPtr) {
            return null;
        }
        return new XmlAttribute(attrPtr);
    }

    /**
     * Set the attribute of this element.
     * @param name The name of the attribute
     * @param value The value of the attribute
     * @param prefix The namespace prefix to the attribute.
     */
    setAttr(name: string, value: string, prefix?: string): XmlAttribute {
        const ns = xmlSearchNs(XmlNodeStruct.doc(this._nodePtr), this._nodePtr, prefix || null);
        if (!ns && prefix) {
            throw new XmlError(`Namespace prefix "${prefix}" not found`);
        }
        return new XmlAttribute(xmlSetNsProp(this._nodePtr, ns, name, value));
    }

    /**
     * Add a child comment node to the end of the children list.
     * @param content the content of the comment
     *
     * @see {@link appendComment}
     * @see {@link prependComment}
     */
    addComment(content: string): XmlComment {
        let node = xmlNewDocComment(XmlNodeStruct.doc(this._nodePtr), content);
        node = xmlAddChild(this._nodePtr, node);
        return new XmlComment(node);
    }

    /**
     * Add a child CDATA section node to the end of the children list.
     * @param content the content of the CDATA section
     *
     * @see {@link appendCData}
     * @see {@link prependCData}
     */
    addCData(content: string): XmlCData {
        let node = xmlNewCDataBlock(XmlNodeStruct.doc(this._nodePtr), content);
        node = xmlAddChild(this._nodePtr, node);
        return new XmlCData(node);
    }

    /**
     * Add a child text node to the end of the children list.
     * Note that this method will merge the text node if the last child is also a text node.
     * @param text the content of the text node
     *
     * @see {@link appendText}
     * @see {@link prependText}
     */
    addText(text: string): XmlText {
        let node = xmlNewDocText(XmlNodeStruct.doc(this._nodePtr), text);
        node = xmlAddChild(this._nodePtr, node);
        return new XmlText(node);
    }
}

export class XmlAttribute extends XmlNamedNode {
    /**
     * Remove current attribute from the element and document.
     */
    remove(): void {
        if (!this._nodePtr) {
            return;
        }
        if (xmlRemoveProp(this._nodePtr)) {
            throw new XmlError('Failed to remove attribute');
        }
        this._nodePtr = 0;
    }
}

class XmlSimpleNode extends XmlNode {
    get content(): string {
        return super.content;
    }

    /**
     * Set the content of the node.
     * @param value the new content
     */
    set content(value: string) {
        xmlNodeSetContent(this._nodePtr, value);
    }
}

export class XmlCData extends XmlSimpleNode {
}

export class XmlComment extends XmlSimpleNode {
}

export class XmlText extends XmlSimpleNode {
}
