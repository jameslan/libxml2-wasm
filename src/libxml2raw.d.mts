type Pointer = number;
type CString = Pointer;
type XmlAttrPtr = Pointer;
type XmlCharEncodingHandlerPtr = Pointer;
type XmlParserCtxtPtr = Pointer;
type XmlDocPtr = Pointer;
type XmlDtdPtr = Pointer;
type XmlErrorPtr = Pointer;
type XmlNodePtr = Pointer;
type XmlNsPtr = Pointer;
type XmlOutputCloseCallback = Pointer;
type XmlOutputWriteCallback = Pointer;
type XmlRelaxNGParserCtxtPtr = Pointer;
type XmlRelaxNGPtr = Pointer;
type XmlRelaxNGValidCtxtPtr = Pointer;
type XmlSaveCtxtPtr = Pointer;
type XmlSchemaParserCtxtPtr = Pointer;
type XmlSchemaPtr = Pointer;
type XmlSchemaValidCtxtPtr = Pointer;
type XmlStructuredErrorFunc = Pointer;
type XmlXIncludeCtxtPtr = Pointer;
type XmlXPathCompExprPtr = Pointer;
type XmlXPathContextPtr = Pointer;
type XmlXPathObjectPtr = Pointer;

export class LibXml2 {
    HEAP32: Int32Array;

    HEAPU8: Uint8Array;

    _free(memblock: Pointer): void;
    _malloc(size: number): Pointer;

    _xmlAddChild(parent: XmlNodePtr, cur: XmlNodePtr): XmlNodePtr;
    _xmlAddNextSibling(prev: XmlNodePtr, cur: XmlNodePtr): XmlNodePtr;
    _xmlAddPrevSibling(next: XmlNodePtr, cur: XmlNodePtr): XmlNodePtr;
    _xmlCleanupInputCallbacks(): void;
    _xmlCtxtReadMemory(
        ctxt: XmlParserCtxtPtr,
        buffer: CString,
        length: number,
        url: CString,
        encoding: CString,
        options: number,
    ): XmlDocPtr;
    _xmlCtxtSetErrorHandler(
        ctxt: XmlParserCtxtPtr,
        handler: XmlStructuredErrorFunc,
        data: Pointer,
    ): void;
    _xmlCtxtValidateDtd(ctxt: XmlParserCtxtPtr, doc: XmlDocPtr, dtd: XmlDtdPtr): number;
    _xmlFreeNode(node: XmlNodePtr): void;
    _xmlFreeParserCtxt(ctxt: XmlParserCtxtPtr): void;
    _xmlDocGetRootElement(doc: XmlDocPtr): XmlNodePtr;
    _xmlDocSetRootElement(doc: XmlDocPtr, root: XmlNodePtr): XmlNodePtr;
    _xmlFreeDoc(Doc: XmlDocPtr): void;
    _xmlFreeDtd(dtd: XmlDtdPtr): void;
    _xmlGetIntSubset(doc: XmlDocPtr): XmlDtdPtr;
    _xmlGetLastError(): XmlErrorPtr;
    _xmlGetNsList(doc: XmlDocPtr, node: XmlNodePtr): Pointer;
    _xmlHasNsProp(node: XmlNodePtr, name: CString, namespace: CString): XmlAttrPtr;
    _xmlInitParser(): void;
    _xmlNewDoc(): XmlDocPtr;
    _xmlNewDtd(): XmlDtdPtr;
    _xmlNewCDataBlock(doc: XmlDocPtr, content: CString, len: number): XmlNodePtr;
    _xmlNewDocComment(doc: XmlDocPtr, content: CString): XmlNodePtr;
    _xmlNewDocNode(doc: XmlDocPtr, ns: XmlNsPtr, name: CString, content: CString): XmlNodePtr;
    _xmlNewDocTextLen(doc: XmlDocPtr, content: CString, len: number): XmlNodePtr;
    _xmlNewNs(node: XmlNodePtr, href: CString, prefix: CString): XmlNsPtr;
    _xmlNewParserCtxt(): XmlParserCtxtPtr;
    _xmlNewReference(doc: XmlDocPtr, name: CString): XmlNodePtr;
    _xmlNodeGetContent(node: XmlNodePtr): CString;
    _xmlNodeSetContentLen(node: XmlNodePtr, content: CString, len: number): number;
    _xmlRegisterInputCallbacks(
        xmlInputMatchCallback: Pointer,
        xmlInputOpenCallback: Pointer,
        xmlInputReadCallback: Pointer,
        xmlInputCloseCallback: Pointer,
    ): number;
    _xmlRelaxNGFree(schema: XmlRelaxNGPtr): void;
    _xmlRelaxNGFreeParserCtxt(ctxt: XmlRelaxNGParserCtxtPtr): void;
    _xmlRelaxNGFreeValidCtxt(ctxt: XmlRelaxNGValidCtxtPtr): void;
    _xmlRelaxNGNewDocParserCtxt(doc: XmlDocPtr): XmlRelaxNGParserCtxtPtr;
    _xmlRelaxNGNewValidCtxt(schema: XmlRelaxNGPtr): XmlRelaxNGValidCtxtPtr;
    _xmlRelaxNGParse(ctxt: XmlRelaxNGParserCtxtPtr): XmlRelaxNGPtr;
    _xmlRelaxNGSetParserStructuredErrors(
        ctxt: XmlRelaxNGValidCtxtPtr,
        handler: XmlStructuredErrorFunc,
        data: Pointer,
    ): void;
    _xmlRelaxNGSetValidStructuredErrors(
        ctxt: XmlRelaxNGValidCtxtPtr,
        handler: XmlStructuredErrorFunc,
        data: Pointer,
    ): void;
    _xmlRelaxNGValidateDoc(ctxt: XmlRelaxNGValidCtxtPtr, doc: XmlDocPtr): number;
    _xmlRemoveProp(cur: XmlAttrPtr): number;
    _xmlResetLastError(): void;
    _xmlSaveClose(ctxt: XmlSaveCtxtPtr): void;
    _xmlSaveDoc(ctxt: XmlSaveCtxtPtr, doc: XmlDocPtr): number;
    _xmlSaveSetIndentString(ctxt: XmlSaveCtxtPtr, indent: CString): number;
    _xmlSaveToIO(
        iowrite: XmlOutputWriteCallback,
        ioclose: XmlOutputCloseCallback,
        context: Pointer,
        encoding: CString,
        options: number,
    ): XmlSaveCtxtPtr;
    _xmlSaveTree(ctxt: XmlSaveCtxtPtr, node: XmlNodePtr): number;
    _xmlSearchNs(doc: XmlDocPtr, node: XmlNodePtr, prefix: CString): XmlNsPtr;
    _xmlSetNs(node: XmlNodePtr, ns: XmlNsPtr): void;
    _xmlSetNsProp(node: XmlNodePtr, ns: XmlNsPtr, name: CString, value: CString): XmlAttrPtr;
    _xmlXIncludeFreeContext(ctx: XmlXIncludeCtxtPtr): void;
    _xmlXIncludeNewContext(doc: XmlDocPtr): XmlXIncludeCtxtPtr;
    _xmlXIncludeProcessNode(ctxt: XmlXIncludeCtxtPtr, node: XmlNodePtr): number;
    _xmlXIncludeSetErrorHandler(
        ctxt: XmlXIncludeCtxtPtr,
        handler: XmlStructuredErrorFunc,
        data: Pointer,
    ): void;
    _xmlXPathCompiledEval(comp: XmlXPathCompExprPtr, ctx: XmlXPathContextPtr): XmlXPathObjectPtr;
    _xmlXPathCtxtCompile(ctxt: XmlXPathContextPtr, str: CString): XmlXPathCompExprPtr;
    _xmlXPathFreeCompExpr(comp: XmlXPathCompExprPtr): void;
    _xmlXPathFreeContext(context: XmlXPathContextPtr): void;
    _xmlXPathFreeObject(obj: XmlXPathObjectPtr): void;
    _xmlXPathNewContext(doc: XmlDocPtr): XmlXPathContextPtr;
    _xmlXPathRegisterNs(ctx: XmlXPathContextPtr, prefix: CString, uri: CString): number;
    _xmlXPathSetContextNode(node: XmlNodePtr, ctx: XmlXPathContextPtr): number;
    _xmlSchemaNewDocParserCtxt(doc: XmlDocPtr): XmlSchemaParserCtxtPtr;
    _xmlSchemaFree(schema: XmlSchemaPtr): void;
    _xmlSchemaFreeParserCtxt(ctx: XmlSchemaParserCtxtPtr): void;
    _xmlSchemaFreeValidCtxt(ctx: XmlSchemaValidCtxtPtr): void;
    _xmlSchemaNewValidCtxt(schema: XmlSchemaPtr): XmlSchemaValidCtxtPtr;
    _xmlSchemaParse(ctx: XmlSchemaParserCtxtPtr): XmlSchemaPtr;
    _xmlSchemaSetParserStructuredErrors(
        ctx: XmlSchemaParserCtxtPtr,
        handler: XmlStructuredErrorFunc,
        data: Pointer,
    ): void;
    _xmlSchemaSetValidStructuredErrors(
        ctx: XmlSchemaValidCtxtPtr,
        handler: XmlStructuredErrorFunc,
        data: Pointer,
    ): void;
    _xmlSchemaValidateDoc(ctx: XmlSchemaValidCtxtPtr, doc: XmlDocPtr): number;
    _xmlSchemaValidateOneElement(ctx: XmlSchemaValidCtxtPtr, elem: XmlNodePtr): number;
    _xmlUnlinkNode(cur: XmlNodePtr): void;
    // runtime functions
    UTF8ToString(ptr: CString, maxBytesToRead?: number): string;
    addFunction(func: Function, sig: string): Pointer;
    getValue(ptr: Pointer, type: string): number;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: CString, maxBytesToWrite: number): CString;
}

export default function moduleLoader(): Promise<LibXml2>;
