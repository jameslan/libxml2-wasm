import {
    error,
    SaveOptions,
    xmlCtxtSetErrorHandler,
    xmlDocGetRootElement,
    xmlDocSetRootElement,
    XmlError,
    xmlFreeDoc,
    xmlFreeNode,
    xmlFreeParserCtxt,
    xmlGetIntSubset,
    XmlLibError,
    xmlNewDoc,
    xmlNewDocNode,
    xmlNewParserCtxt,
    XmlOutputBufferHandler,
    xmlReadMemory,
    xmlReadString,
    xmlSaveClose,
    xmlSaveDoc,
    xmlSaveOption,
    xmlSaveSetIndentString,
    xmlSaveToIO,
    xmlXIncludeFreeContext,
    xmlXIncludeNewContext,
    xmlXIncludeProcessNode,
    xmlXIncludeSetErrorHandler,
} from './libxml2.mjs';
import { XmlElement, type XmlNode } from './nodes.mjs';
import { NamespaceMap, XmlXPath } from './xpath.mjs';
import type { XmlDocPtr, XmlParserCtxtPtr } from './libxml2raw.mjs';
import { disposeBy, XmlDisposable } from './disposable.mjs';
import { XmlDtd } from './dtd.mjs';
import { XmlStringOutputBufferHandler } from './utils.mjs';

export enum ParseOption {
    XML_PARSE_DEFAULT = 0,
    /**
     * Enable "recovery" mode which allows non-wellformed documents.
     * How this mode behaves exactly is unspecified and may change without further notice.
     * Use of this feature is DISCOURAGED.
     *
     * Not supported by the push parser.
     */
    XML_PARSE_RECOVER = 1 << 0,
    /**
     * Despite the confusing name, this option enables substitution of entities.
     * The resulting tree won't contain any entity reference nodes.
     *
     * This option also enables loading of external entities (both general and parameter entities)
     * which is dangerous. If you process untrusted data, it's recommended to set the
     * XML_PARSE_NO_XXE option to disable loading of external entities.
     */
    XML_PARSE_NOENT = 1 << 1,
    /**
     * Enables loading of an external DTD and the loading and substitution of external
     * parameter entities. Has no effect if XML_PARSE_NO_XXE is set.
     */
    XML_PARSE_DTDLOAD = 1 << 2,
    /**
     * Adds default attributes from the DTD to the result document.
     *
     * Implies XML_PARSE_DTDLOAD, but loading of external content
     * can be disabled with XML_PARSE_NO_XXE.
     */
    XML_PARSE_DTDATTR = 1 << 3,
    /**
     * Enable DTD validation which requires loading external DTDs and external entities
     * (both general and parameter entities) unless XML_PARSE_NO_XXE was set.
     *
     * DTD validation is vulnerable to algorithmic complexity attacks and should never be
     * enabled with untrusted input.
     */
    XML_PARSE_DTDVALID = 1 << 4,
    /**
     * Disable error and warning reports to the error handlers.
     * Errors are still accessible with xmlCtxtGetLastError().
     */
    XML_PARSE_NOERROR = 1 << 5,
    /** Disable warning reports. */
    XML_PARSE_NOWARNING = 1 << 6,
    /** Enable some pedantic warnings. */
    XML_PARSE_PEDANTIC = 1 << 7,
    /**
     * Remove some whitespace from the result document. Where to remove whitespace depends on
     * DTD element declarations or a broken heuristic with unfixable bugs. Use of this option is
     * DISCOURAGED.
     *
     * Not supported by the push parser.
     */
    XML_PARSE_NOBLANKS = 1 << 8,
    /**
     * Always invoke the deprecated SAX1 startElement and endElement handlers.
     *
     * @deprecated This option will be removed in a future version.
     */
    XML_PARSE_SAX1 = 1 << 9,
    /**
     * Enable XInclude processing. This option only affects the xmlTextReader
     * and XInclude interfaces.
     */
    XML_PARSE_XINCLUDE = 1 << 10,
    /**
     * Disable network access with the built-in HTTP or FTP clients.
     * After the last built-in network client was removed in 2.15, this option has no effect
     * except for being passed on to custom resource loaders.
     */
    XML_PARSE_NONET = 1 << 11,
    /**
     * Create a document without interned strings, making all strings separate memory allocations.
     */
    XML_PARSE_NODICT = 1 << 12,
    /** Remove redundant namespace declarations from the result document. */
    XML_PARSE_NSCLEAN = 1 << 13,
    /** Output normal text nodes instead of CDATA nodes. */
    XML_PARSE_NOCDATA = 1 << 14,
    /**
     * Don't generate XInclude start/end nodes when expanding inclusions.
     * This option only affects the xmlTextReader and XInclude interfaces.
     */
    XML_PARSE_NOXINCNODE = 1 << 15,
    /**
     * Store small strings directly in the node struct to save memory.
     */
    XML_PARSE_COMPACT = 1 << 16,
    /**
     * Use old Name productions from before XML 1.0 Fifth Edition.
     *
     * @deprecated This option will be removed in a future version.
     */
    XML_PARSE_OLD10 = 1 << 17,
    /**
     * Don't fix up XInclude xml:base URIs. This option only affects the xmlTextReader
     * and XInclude interfaces.
     */
    XML_PARSE_NOBASEFIX = 1 << 18,
    /**
     * Relax some internal limits.
     *
     * Maximum size of text nodes, tags, comments, processing instructions,
     * CDATA sections, entity values
     *
     *  - normal: 10M
     *  - huge:    1B
     *
     * Maximum size of names, system literals, pubid literals
     *
     *  - normal: 50K
     *  - huge:   10M
     *
     * Maximum nesting depth of elements
     *
     *  - normal:  256
     *  - huge:   2048
     *
     * Maximum nesting depth of entities
     *
     *  - normal: 20
     *  - huge:   40
     */
    XML_PARSE_HUGE = 1 << 19,
    /**
     * Enable an unspecified legacy mode for SAX parsers.
     *
     * @deprecated This option will be removed in a future version.
     */
    XML_PARSE_OLDSAX = 1 << 20,
    /**
     * Ignore the encoding in the XML declaration. Mostly unneeded these days.
     * The only effect is to enforce UTF-8 decoding of ASCII-like data.
     */
    XML_PARSE_IGNORE_ENC = 1 << 21,
    /** Enable reporting of line numbers larger than 65535. */
    XML_PARSE_BIG_LINES = 1 << 22,
    /**
     * Disable loading of external DTDs or entities.
     */
    XML_PARSE_NO_XXE = 1 << 23,
    /**
     * Enable input decompression. Setting this option is discouraged to avoid zip bombs.
     */
    XML_PARSE_UNZIP = 1 << 24,
    /**
     * Disable the global system XML catalog.
     */
    XML_PARSE_NO_SYS_CATALOG = 1 << 25,
    /**
     * Enable XML catalog processing instructions.
     */
    XML_PARSE_CATALOG_PI = 1 << 26,
    /**
     * Force the parser to ignore IDs.
     */
    XML_PARSE_SKIP_IDS = 1 << 27,
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
        const errDetails = error.storage.get(errIndex);
        if (errDetails.length > 0) {
            if (!xml) {
                xmlFreeDoc(xml);
            }
            throw new XmlParseError(errDetails!.map((d) => d.message).join(''), errDetails!);
        }
    } finally {
        error.storage.free(errIndex);
        xmlFreeParserCtxt(ctxt);
    }

    if (!xml) {
        // no error from libxml2, but failed to parse. Usually due to invalid input.
        throw new XmlParseError('Failed to parse XML', []);
    }
    const xmlDocument = XmlDocument.getInstance(xml);
    if (xmlOptions & ParseOption.XML_PARSE_XINCLUDE) {
        xmlDocument.processXInclude();
    }
    return xmlDocument;
}

function freeDocument(ptr: XmlDocPtr) {
    // If there is a DTD, check if there is a wrapper
    // If yes, dispose it to unregister the wrapper
    const dtd = xmlGetIntSubset(ptr);
    if (dtd) {
        XmlDtd.peekInstance(dtd)?.dispose();
    }

    xmlFreeDoc(ptr);
}

/**
 * The XML document.
 */
@disposeBy(freeDocument)
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
     * @see {@link save}
     * @see {@link XmlElement#toString}
     */
    toString(options?: SaveOptions): string {
        const handler = new XmlStringOutputBufferHandler();
        this.save(handler, options);

        return handler.result;
    }

    /**
     * Save the XmlDocument to a buffer and invoke the callbacks to process.
     *
     * @deprecated Use `save` instead.
     */
    toBuffer(handler: XmlOutputBufferHandler, options?: SaveOptions) {
        return this.save(handler, options);
    }

    /**
     * Save the XmlDocument to a buffer and invoke the callbacks to process.
     *
     * @param handler handlers to process the content in the buffer
     * @param options options to adjust the saving behavior
     * @see {@link toString}
     * @see {@link XmlElement#save}
     */
    save(handler: XmlOutputBufferHandler, options?: SaveOptions) {
        const ctxt = xmlSaveToIO(handler, null, xmlSaveOption(options));
        if (options?.indentString) {
            if (xmlSaveSetIndentString(ctxt, options.indentString) < 0) {
                throw new XmlError('Failed to set indent string');
            }
        }
        xmlSaveDoc(ctxt, this._ptr);
        xmlSaveClose(ctxt);
    }

    /**
     * Find the first descendant node of root element matching the given compiled xpath selector.
     * @param xpath XPath selector
     * @returns null if not found, otherwise an instance of the subclass of {@link XmlNode}.
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link XmlXPath.compile | XmlXPath.compile}
     *  - {@link find}
     *  - {@link eval}
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
     *  - {@link eval}
     */
    get(xpath: string, namespaces?: NamespaceMap): XmlNode | null;
    get(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode | null {
        return this.root.get(xpath, namespaces);
    }

    /**
     * Find all the descendant nodes of root element matching the given compiled xpath selector.
     * @param xpath Compiled XPath selector
     * @returns An empty array if no nodes are found.
     * @see
     *  - {@link XmlNode#find | XmlNode.find}
     *  - {@link get}
     *  - {@link eval}
     */
    find(xpath: XmlXPath): XmlNode[];
    /**
     * Find all the descendant nodes of root element matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and the namespace URI, used in the XPath
     * @returns An empty array if no nodes are found.
     * @see
     *  - {@link XmlNode#find | XmlNode.find}
     *  - {@link get}
     *  - {@link eval}
     */
    find(xpath: string, namespaces?: NamespaceMap): XmlNode[];
    find(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode[] {
        return this.root.find(xpath, namespaces);
    }

    /**
     * Evaluate the given XPath selector on the root element.
     * @param xpath XPath selector
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link XmlXPath.compile | XmlXPath.compile}
     *  - {@link get}
     *  - {@link find}
     */
    eval(xpath: XmlXPath): XmlNode[] | string | boolean | number;
    /**
     * Evaluate the given XPath selector on the root element.
     * @param xpath XPath selector
     * @see
     *  - {@link XmlNode#get | XmlNode.get}
     *  - {@link get}
     *  - {@link find}
     */
    eval(xpath: string, namespaces?: NamespaceMap): XmlNode[] | string | boolean | number;
    eval(
        xpath: string | XmlXPath,
        namespaces?: NamespaceMap,
    ): XmlNode[] | string | boolean | number {
        return this.root.eval(xpath, namespaces);
    }

    /**
     * Get the DTD of the document.
     * @returns The DTD of the document, or null if the document has no DTD.
     */
    get dtd(): XmlDtd | null {
        const dtd = xmlGetIntSubset(this._ptr);
        return dtd ? XmlDtd.getInstance(dtd) : null;
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
            root.addNsDeclaration(namespace, prefix);
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
    processXInclude(): number {
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
