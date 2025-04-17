import {
    error,
    xmlCtxtSetErrorHandler,
    xmlDocGetRootElement,
    xmlDocSetRootElement,
    XmlError,
    xmlFreeDoc,
    xmlFreeNode,
    xmlFreeParserCtxt,
    XmlLibError,
    xmlNewDoc,
    xmlNewDocNode,
    xmlNewParserCtxt,
    xmlOutputBufferCreate,
    XmlOutputBufferHandler,
    xmlReadMemory,
    xmlReadString,
    xmlSaveFormatFileTo,
    xmlXIncludeFreeContext,
    xmlXIncludeNewContext,
    xmlXIncludeProcessNode,
    xmlXIncludeSetErrorHandler,
} from './libxml2.mjs';
import { XmlElement, type XmlNode } from './nodes.mjs';
import { NamespaceMap, XmlXPath } from './xpath.mjs';
import type { XmlDocPtr, XmlParserCtxtPtr } from './libxml2raw.cjs';
import { disposeBy, XmlDisposable } from './disposable.mjs';

export enum ParseOption {
    XML_PARSE_DEFAULT = 0,
    /** recover on errors */
    XML_PARSE_RECOVER = 1 << 0,
    /** substitute entities */
    XML_PARSE_NOENT = 1 << 1,
    /** load the external subset */
    XML_PARSE_DTDLOAD = 1 << 2,
    /** default DTD attributes */
    XML_PARSE_DTDATTR = 1 << 3,
    /** validate with the DTD */
    XML_PARSE_DTDVALID = 1 << 4,
    /** suppress error reports */
    XML_PARSE_NOERROR = 1 << 5,
    /** suppress warning reports */
    XML_PARSE_NOWARNING = 1 << 6,
    /** pedantic error reporting */
    XML_PARSE_PEDANTIC = 1 << 7,
    /** remove blank nodes */
    XML_PARSE_NOBLANKS = 1 << 8,
    /** use the SAX1 interface internally */
    XML_PARSE_SAX1 = 1 << 9,
    /** Implement XInclude substitution  */
    XML_PARSE_XINCLUDE = 1 << 10,
    /** Forbid network access */
    XML_PARSE_NONET = 1 << 11,
    /** Do not reuse the context dictionary */
    XML_PARSE_NODICT = 1 << 12,
    /** remove redundant namespaces declarations */
    XML_PARSE_NSCLEAN = 1 << 13,
    /** merge CDATA as text nodes */
    XML_PARSE_NOCDATA = 1 << 14,
    /** do not generate XINCLUDE START/END nodes */
    XML_PARSE_NOXINCNODE = 1 << 15,
    /** compact small text nodes;
     * no modification of the tree allowed afterward
     * (will possibly crash if you try to modify the tree)
     */
    XML_PARSE_COMPACT = 1 << 16,
    /** parse using XML-1.0 before update 5 */
    XML_PARSE_OLD10 = 1 << 17,
    /** do not fixup XINCLUDE xml:base uris */
    XML_PARSE_NOBASEFIX = 1 << 18,
    /** relax any hardcoded limit from the parser */
    XML_PARSE_HUGE = 1 << 19,
    /* parse using SAX2 interface before 2.7.0 */
    XML_PARSE_OLDSAX = 1 << 20,
    /** ignore internal document encoding hint */
    XML_PARSE_IGNORE_ENC = 1 << 21,
    /** Store big lines numbers in text PSVI field */
    XML_PARSE_BIG_LINES = 1 << 22,
    /** disable loading of external content */
    XML_PARSE_NO_XXE = 1 << 23,
    /** allow compressed content */
    XML_PARSE_UNZIP = 1 << 24,
    /** disable global system catalog */
    XML_PARSE_NO_SYS_CATALOG = 1 << 25,
    /** allow catalog PIs */
    XML_PARSE_CATALOG_PI = 1 << 26,
}

export interface ParseOptions {
    /**
     * The URL of the document.
     *
     * It can be used as a base to calculate the URL of other included documents.
     */
    url?: string;
    encoding?: string; // reserved
    option?: ParseOption;
}

export class XmlParseError extends XmlLibError {
}

/**
 * Options to be passed in the call to saving functions
 *
 * @see {@link XmlDocument#toBuffer}
 * @see {@link XmlDocument#toString}
 */
export interface SaveOptions {
    /**
     * To enable formatting on the output,
     * creating a separate line for each tag and indent the text accordingly.
     *
     * @default true
     */
    format?: boolean;
}

function parse<Input>(
    parser: (
        ctxt: XmlParserCtxtPtr,
        source: Input,
        url: string | null,
        encoding: string | null,
        options: number,
    ) => XmlDocPtr,
    source: Input,
    url: string | null,
    options: ParseOptions,
): XmlDocument {
    const xmlOptions = options.option ?? ParseOption.XML_PARSE_DEFAULT;
    const ctxt = xmlNewParserCtxt();
    const errIndex = error.storage.allocate([]);
    xmlCtxtSetErrorHandler(ctxt, error.errorCollector, errIndex);
    const xml = parser(
        ctxt,
        source,
        url,
        null,
        xmlOptions,
    );
    try {
        if (!xml) {
            const errDetails = error.storage.get(errIndex);
            throw new XmlParseError(errDetails!.map((d) => d.message).join(''), errDetails!);
        }
    } finally {
        error.storage.free(errIndex);
        xmlFreeParserCtxt(ctxt);
    }

    const xmlDocument = XmlDocument.getInstance(xml);
    if (xmlOptions & ParseOption.XML_PARSE_XINCLUDE) {
        xmlDocument.processXIncludeSync();
    }
    return xmlDocument;
}

/**
 * The XML document.
 */
@disposeBy(xmlFreeDoc)
export class XmlDocument extends XmlDisposable<XmlDocument> {
    /** Create a new document from scratch.
     * To parse an existing xml, use {@link fromBuffer} or {@link fromString}.
     */
    static create(): XmlDocument {
        return XmlDocument.getInstance(xmlNewDoc());
    }

    /**
     * Parse and create an {@link XmlDocument} from an XML string.
     * @param source The XML string
     * @param options Parsing options
     */
    static fromString(
        source: string,
        options: ParseOptions = {},
    ): XmlDocument {
        return parse(xmlReadString, source, options.url ?? null, options);
    }

    /**
     * Parse and create an {@link XmlDocument} from an XML buffer.
     * @param source The XML buffer
     * @param options Parsing options
     */
    static fromBuffer(
        source: Uint8Array,
        options: ParseOptions = {},
    ): XmlDocument {
        return parse(xmlReadMemory, source, options.url ?? null, options);
    }

    /**
     * Save the XmlDocument to a string
     * @param options options to adjust the saving behavior
     */
    toString(options?: SaveOptions): string {
        const decoder = new TextDecoder();
        const handler = {
            result: '',
            write(buf: Uint8Array) {
                this.result += decoder.decode(buf);
                return buf.length;
            },

            close() {
                return true;
            },
        };
        this.toBuffer(handler, options);

        return handler.result;
    }

    /**
     * Save the XmlDocument to a buffer and invoke the callbacks to process.
     *
     * @param handler handlers to process the content in the buffer
     * @param options options to adjust the saving behavior
     */
    toBuffer(handler: XmlOutputBufferHandler, options?: SaveOptions) {
        const buf = xmlOutputBufferCreate(handler);
        xmlSaveFormatFileTo(buf, this._ptr, null, options?.format ?? true ? 1 : 0);
    }

    /**
     * Find the first descendant node of root element matching the given compiled xpath selector.
     * @param xpath XPath selector
     * @returns null if not found, otherwise an instance of the subclass of {@link XmlNode}.
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link XmlXPath.compile | XmlXPath.compile}
     *  - {@link find}
     */
    get(xpath: XmlXPath): XmlNode | null;
    /**
     * Find the first descendant node of root element matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and the namespace URI, used in the XPath
     * @returns null if not found, otherwise an instance of the subclass of {@link XmlNode}.
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link find}
     */
    get(xpath: string, namespaces?: NamespaceMap): XmlNode | null;
    get(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode | null {
        return this.root.get(xpath, namespaces);
    }

    /**
     * Find all the descendant nodes of root element matching the given compiled xpath selector.
     * @param xpath Compiled XPath selector
     * @returns An empty array if the provided XPath is invalid or if no nodes are found.
     * @see
     *  - {@link XmlNode#find | XmlNode.find}
     *  - {@link get}
     */
    find(xpath: XmlXPath): XmlNode[];
    /**
     * Find all the descendant nodes of root element matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and the namespace URI, used in the XPath
     * @returns An empty array if the provided XPath is invalid or if no nodes are found.
     * @see
     *  - {@link XmlNode#find | XmlNode.find}
     *  - {@link get}
     */
    find(xpath: string, namespaces?: NamespaceMap): XmlNode[];
    find(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode[] {
        return this.root.find(xpath, namespaces);
    }

    /**
     * The root element of the document.
     * If the document is newly created and hasn’t been set up with a root,
     * an {@link XmlError} will be thrown.
     */
    get root(): XmlElement {
        const root = xmlDocGetRootElement(this._ptr);
        if (!root) {
            // TODO: get error information from libxml2
            throw new XmlError();
        }
        return new XmlElement(root);
    }

    /**
     * Set the root element of the document.
     * @param value The new root.
     * If the node is from another document,
     * it and its subtree will be removed from the previous document.
     */
    set root(value: XmlElement) {
        const old = xmlDocSetRootElement(this._ptr, value._nodePtr);
        if (old) {
            xmlFreeNode(old);
        }
    }

    /**
     * Create the root element.
     * @param name The name of the root element.
     * @param namespace The namespace of the root element.
     * @param prefix The prefix of the root node that represents the given namespace.
     * If not provided, the given namespace will be the default.
     */
    createRoot(name: string, namespace?: string, prefix?: string): XmlElement {
        const elem = xmlNewDocNode(this._ptr, 0, name);
        const root = new XmlElement(elem);
        if (namespace) {
            root.addLocalNamespace(namespace, prefix);
            root.namespacePrefix = prefix ?? '';
        }
        this.root = root;
        return root;
    }

    /**
     * Process the XInclude directives in the document synchronously.
     *
     * @returns the number of XInclude nodes processed.
     */
    processXIncludeSync(): number {
        const errIndex = error.storage.allocate([]);
        const xinc = xmlXIncludeNewContext(this._ptr);
        xmlXIncludeSetErrorHandler(xinc, error.errorCollector, errIndex);
        try {
            const ret = xmlXIncludeProcessNode(xinc, this._ptr);
            if (ret < 0) {
                const errDetails = error.storage.get(errIndex);
                throw new XmlParseError(errDetails!.map((d) => d.message).join(''), errDetails!);
            }
            return ret;
        } finally {
            error.storage.free(errIndex);
            xmlXIncludeFreeContext(xinc);
        }
    }
}
