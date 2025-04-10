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
    xmlNewDocNode,
    xmlNewDocText,
    xmlNewNs,
    xmlNewReference,
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
import type { XmlDocPtr, XmlNodePtr, XmlNsPtr } from './libxml2raw.cjs';
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
        : XmlXPath.compile(xpath, namespaces);
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
        case XmlNodeStruct.Type.XML_ENTITY_REF_NODE:
            return new XmlEntityReference(nodePtr);
        case XmlNodeStruct.Type.XML_CDATA_SECTION_NODE:
            return new XmlCData(nodePtr);
        default:
            throw new XmlError(`Unsupported node type ${nodeType}`);
    }
}

function createNullableNode(nodePtr: XmlNodePtr): XmlNode | null {
    return nodePtr ? createNode(nodePtr) : null;
}

function addNode(
    nodePtr: XmlNodePtr,
    content: string,
    create: (doc: XmlDocPtr, content: string) => XmlNodePtr,
    process: (node: XmlNodePtr, cur: XmlNodePtr) => XmlNodePtr,
): XmlNodePtr {
    let newNode = create(XmlNodeStruct.doc(nodePtr), content);
    newNode = process(nodePtr, newNode);
    return newNode;
}

function findNamespace(nodePtr: XmlNodePtr, prefix?: string): XmlNsPtr {
    // Check if the namespace prefix valid for the current node
    const ns = xmlSearchNs(XmlNodeStruct.doc(nodePtr), nodePtr, prefix || null);
    if (!ns && prefix) {
        throw new XmlError(`Namespace prefix "${prefix}" not found`);
    }
    return ns;
}

function addElement(nodePtr: XmlNodePtr, name: string, prefix?: string): XmlNodePtr {
    const ns = findNamespace(nodePtr, prefix);
    return xmlNewDocNode(XmlNodeStruct.doc(nodePtr), ns, name);
}

/**
 * The base class for all types of XML nodes.
 */
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
     * The parent node of this node.
     *
     * For root node, its parent is null.
     */
    get parent(): XmlElement | null {
        const parent = XmlNodeStruct.parent(this._nodePtr);
        if (!parent || parent === XmlNodeStruct.doc(this._nodePtr)) {
            return null;
        }
        return new XmlElement(parent);
    }

    /**
     * The content string of the node.
     */
    get content(): string {
        return xmlNodeGetContent(this._nodePtr);
    }

    /**
     * The line number of the node if the node is parsed from an XML document.
     */
    get line(): number {
        return XmlNodeStruct.line(this._nodePtr);
    }

    /**
     * Find the first descendant node matching the given compiled xpath selector
     *
     * @param xpath XPath selector
     * @returns null if not found, otherwise an instance of the subclass of {@link XmlNode}.
     * @see
     * - {@link find}
     * - {@link XmlXPath.compile | XmlXPath.compile}
     */
    get(xpath: XmlXPath): XmlNode | null;
    /**
     * Find the first descendant node matching the given xpath selector
     *
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and the namespace URI, used in the XPath
     * @returns null if not found, otherwise an instance of the subclass of {@link XmlNode}.
     * @see {@link find}
     */
    get(xpath: string, namespaces?: NamespaceMap): XmlNode | null;
    /** @internal */
    get(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode | null;
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

    /**
     * Find all the descendant nodes matching the given compiled xpath selector.
     * @param xpath XPath selector
     * @returns An empty array if the provided XPath is invalid or if no nodes are found.
     * @see
     *  - {@link get}
     *  - {@link XmlXPath.compile | XmlXPath.compile}
     */
    find(xpath: XmlXPath): XmlNode[];
    /**
     * Find all the descendant nodes matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and the namespace URI, used in the XPath
     * @returns An empty array if the provided XPath is invalid or if no nodes are found.
     * @see
     *  - {@link get}
     */
    find(xpath: string, namespaces?: NamespaceMap): XmlNode[];
    /** @internal */
    find(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode[];
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

/**
 * The base class representing a node that can have siblings.
 */
export abstract class XmlTreeNode extends XmlNode {
    /**
     * Add a comment sibling node after this node.
     *
     * @param content the content of the comment
     *
     * @see {@link prependComment}
     * @see {@link XmlElement#addComment}
     */
    appendComment(content: string): XmlComment {
        return new XmlComment(addNode(this._nodePtr, content, xmlNewDocComment, xmlAddNextSibling));
    }

    /**
     * Insert a comment sibling node before this node.
     * @param content the content of the comment
     *
     * @see {@link appendComment}
     * @see {@link XmlElement#addComment}
     */
    prependComment(content: string): XmlComment {
        return new XmlComment(addNode(this._nodePtr, content, xmlNewDocComment, xmlAddPrevSibling));
    }

    /**
     * Add a CDATA section sibling node after this node.
     * @param content the content of the CDATA section
     *
     * @see {@link prependCData}
     * @see {@link XmlElement#addCData}
     */
    appendCData(content: string): XmlCData {
        return new XmlCData(addNode(this._nodePtr, content, xmlNewCDataBlock, xmlAddNextSibling));
    }

    /**
     * Insert a CDATA section sibling node before this node.
     * @param content the content of the CDATA section
     *
     * @see {@link appendCData}
     * @see {@link XmlElement#addCData}
     */
    prependCData(content: string): XmlCData {
        return new XmlCData(addNode(this._nodePtr, content, xmlNewCDataBlock, xmlAddPrevSibling));
    }

    /**
     * Add an element sibling node after this node.
     * @param name the element name
     * @param prefix the prefix of the element for the namespace
     *
     * @see {@link prependElement}
     * @see {@link XmlElement#addElement}
     */
    appendElement(name: string, prefix?: string): XmlElement {
        const node = addElement(this._nodePtr, name, prefix);
        xmlAddNextSibling(this._nodePtr, node);
        return new XmlElement(node);
    }

    /**
     * Insert an element sibling node before this node.
     * @param name the element name
     * @param prefix the prefix of the element for the namespace
     *
     * @see {@link appendElement}
     * @see {@link XmlElement#addElement}
     */
    prependElement(name: string, prefix?: string): XmlElement {
        const node = addElement(this._nodePtr, name, prefix);
        xmlAddPrevSibling(this._nodePtr, node);
        return new XmlElement(node);
    }

    /**
     * Add a text sibling node after this node.
     * @param text the content of the text node
     *
     * @see {@link prependText}
     * @see {@link XmlElement#addText}
     */
    appendText(text: string): XmlText {
        return new XmlText(addNode(this._nodePtr, text, xmlNewDocText, xmlAddNextSibling));
    }

    /**
     * Insert a text sibling node before this node.
     * @param text the content of the text node
     *
     * @see {@link appendText}
     * @see {@link XmlElement#addText}
     */
    prependText(text: string): XmlText {
        return new XmlText(addNode(this._nodePtr, text, xmlNewDocText, xmlAddPrevSibling));
    }

    /**
     * Add an entity reference sibling node after this node.
     * @param name the name of the entity reference
     * @see {@link prependEntityReference}
     * @see {@link XmlElement#addEntityReference}
     */
    appendEntityReference(name: string): XmlEntityReference {
        return new XmlEntityReference(
            addNode(this._nodePtr, name, xmlNewReference, xmlAddNextSibling),
        );
    }

    /**
     * Insert an entity reference sibling node before this node.
     * @param name the name of the entity reference
     * @see {@link appendEntityReference}
     * @see {@link XmlElement#addEntityReference}
     */
    prependEntityReference(name: string): XmlEntityReference {
        return new XmlEntityReference(
            addNode(this._nodePtr, name, xmlNewReference, xmlAddPrevSibling),
        );
    }

    /**
     * The node that represents the next sibling.
     *
     * @return null if this node is the last one.
     *
     * @see
     *  - {@link XmlElement#firstChild}
     *  - {@link XmlElement#lastChild}
     *  - {@link prev}
     */
    get next(): XmlTreeNode | null {
        const child = XmlNodeStruct.next(this._nodePtr);
        return createNullableNode(child) as XmlTreeNode | null;
    }

    /**
     * The node that represents the previous sibling.
     *
     * @return null if this node is the first one.
     *
     * @see
     *  - {@link XmlElement#firstChild}
     *  - {@link XmlElement#lastChild}
     *  - {@link next}
     */
    get prev(): XmlTreeNode | null {
        const child = XmlNodeStruct.prev(this._nodePtr);
        return createNullableNode(child) as XmlTreeNode | null;
    }
}

/**
 * The interface for the XML nodes that have names and namespaces.
 */
export interface XmlNamedNode {
    /**
     * The name of this node.
     */
    get name(): string;

    /**
     * The URI of the namespace applied to this node.
     */
    get namespaceUri(): string;

    /**
     * The prefix representing the namespace applied to this node.
     */
    get prefix(): string;

    /**
     * Alias of {@link prefix}
     */
    get namespacePrefix(): string;

    /**
     * Set the namespace prefix of this node.
     * @param prefix The new prefix to set.
     * Use empty string to remove the prefix.
     */
    set prefix(prefix: string);

    set namespacePrefix(prefix: string);

    /**
     * Effective namespace declarations on this node, including inherited.
     */
    get namespaces(): NamespaceMap;

    /**
     * Find out corresponding namespace URI for a prefix
     * @param prefix
     */
    namespaceForPrefix(prefix: string): string | null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function namedNode<T>(target: { new (...args: any[]): T }, context: ClassDecoratorContext) {
    Object.defineProperties(target.prototype, {
        namespaces: {
            get() {
                return xmlGetNsList(XmlNodeStruct.doc(this._nodePtr), this._nodePtr).reduce(
                    // convert to object
                    (prev, curr) => ({
                        ...prev,
                        [XmlNsStruct.prefix(curr)]: XmlNsStruct.href(curr),
                    }),
                    {},
                );
            },
        },

        namespaceForPrefix: {
            value(prefix: string): string | null {
                const ns = xmlSearchNs(XmlNodeStruct.doc(this._nodePtr), this._nodePtr, prefix);
                return ns ? XmlNsStruct.href(ns) : null;
            },
        },

        name: {
            get() {
                return XmlNodeStruct.name_(this._nodePtr);
            },
        },

        namespaceUri: {
            get() {
                const namespace = XmlNamedNodeStruct.namespace(this._nodePtr);
                if (namespace) {
                    return XmlNsStruct.href(namespace);
                }
                return '';
            },
        },

        namespacePrefix: {
            get() {
                return this.prefix;
            },

            set(prefix: string) {
                this.prefix = prefix;
            },
        },

        prefix: {
            get() {
                const namespace = XmlNamedNodeStruct.namespace(this._nodePtr);
                if (namespace) {
                    return XmlNsStruct.prefix(namespace);
                }
                return '';
            },
            set(prefix: string) {
                const ns = findNamespace(this._nodePtr, prefix);
                xmlSetNs(this._nodePtr, ns);
            },
        },
    });
}

export interface XmlElement extends XmlNamedNode {}

/**
 * The class representing an XML element node.
 */
@namedNode
export class XmlElement extends XmlTreeNode {
    /**
     * The node representing the first child of an element.
     *
     * Note that the children of an element do not include attributes.
     *
     * @return null if this node has no child.
     *
     * @see
     *  - {@link lastChild}
     *  - {@link next}
     *  - {@link prev}
     */
    get firstChild(): XmlTreeNode | null {
        const child = XmlNodeStruct.children(this._nodePtr);
        return createNullableNode(child) as XmlTreeNode | null;
    }

    /**
     * The node representing the last child of an element.
     *
     * Note that the children of an element do not include attributes.
     *
     * Return null if this node has no child
     *
     * @see
     *  - {@link firstChild}
     *  - {@link next}
     *  - {@link prev}
     */
    get lastChild(): XmlTreeNode | null {
        const child = XmlNodeStruct.last(this._nodePtr);
        return createNullableNode(child) as XmlTreeNode | null;
    }

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
     * Namespace declarations on this element
     *
     * @returns Empty object if there's no local namespace definition on this element.
     * Note that default namespace uses empty string as key in the returned object.
     */
    get nsDeclarations(): NamespaceMap {
        const namespaces: NamespaceMap = {};
        for (let ns = XmlNodeStruct.nsDef(this._nodePtr); ns; ns = XmlNsStruct.next(ns)) {
            namespaces[XmlNsStruct.prefix(ns)] = XmlNsStruct.href(ns);
        }
        return namespaces;
    }

    /**
     * @deprecated use {@link nsDeclarations} instead.
     */
    get localNamespaces(): NamespaceMap {
        return this.nsDeclarations;
    }

    /**
     * Add a namespace declaration to this element.
     * @param uri The namespace URI.
     * @param prefix The prefix that the namespace to be used as.
     * If not provided, it will be treated as default namespace.
     *
     * @throws XmlError if namespace declaration already exists.
     */
    addNsDeclaration(uri: string, prefix?: string): void {
        const namespace = xmlNewNs(this._nodePtr, uri, prefix);
        if (!namespace) {
            throw new XmlError(`Failed to add namespace declaration "${prefix}"`);
        }
    }

    /**
     * @deprecated use {@link addNsDeclaration} instead.
     */
    addLocalNamespace(uri: string, prefix?: string): void {
        this.addNsDeclaration(uri, prefix);
    }

    /**
     * Get the attribute of this element.
     * @param name The name of the attribute
     * @param prefix The namespace prefix to the attribute.
     * @return null if the attribute doesn't exist.
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
        const ns = findNamespace(this._nodePtr, prefix);
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
        return new XmlComment(addNode(this._nodePtr, content, xmlNewDocComment, xmlAddChild));
    }

    /**
     * Add a child CDATA section node to the end of the children list.
     * @param content the content of the CDATA section
     *
     * @see {@link appendCData}
     * @see {@link prependCData}
     */
    addCData(content: string): XmlCData {
        return new XmlCData(addNode(this._nodePtr, content, xmlNewCDataBlock, xmlAddChild));
    }

    /**
     * Add a new element to the end of the children list.
     * @param name the element name
     * @param prefix the prefix of the element for the namespace
     *
     * @see {@link appendElement}
     * @see {@link prependElement}
     */
    addElement(name: string, prefix?: string): XmlElement {
        const node = addElement(this._nodePtr, name, prefix);
        xmlAddChild(this._nodePtr, node);
        return new XmlElement(node);
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
        return new XmlText(addNode(this._nodePtr, text, xmlNewDocText, xmlAddChild));
    }

    /**
     * Add a child entity reference node to the end of the children list.
     * @param name the name of the entity reference
     * @see {@link prependEntityReference}
     * @see {@link appendEntityReference}
     */
    addEntityReference(name: string): XmlEntityReference {
        return new XmlEntityReference(
            addNode(this._nodePtr, name, xmlNewReference, xmlAddChild),
        );
    }
}

export interface XmlAttribute extends XmlNamedNode {}

/**
 * The class representing an XML attribute node.
 */
@namedNode
export class XmlAttribute extends XmlNode {
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

    /**
     * The value of this attribute.
     */
    get value(): string {
        return super.content;
    }

    /**
     * Set the value of this attribute.
     */
    set value(value: string) {
        xmlNodeSetContent(this._nodePtr, value);
    }

    /**
     * Alias of {@link value}.
     */
    get content(): string {
        return this.value;
    }

    set content(value: string) {
        this.value = value;
    }
}

/**
 * A simple node that contains only text content without children.
 */
export abstract class XmlSimpleNode extends XmlTreeNode {
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

export class XmlEntityReference extends XmlTreeNode {
    /**
     * The name of the entity this node references.
     */
    get name(): string {
        return XmlNodeStruct.name_(this._nodePtr);
    }
}
