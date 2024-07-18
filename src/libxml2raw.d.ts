type Pointer = number;
type CString = Pointer;
type XmlAttrPtr = Pointer;
type XmlParserCtxtPtr = Pointer;
type XmlDocPtr = Pointer;
type XmlErrorPtr = Pointer;
type XmlNodePtr = Pointer;
type XmlNsPtr = Pointer;
type XmlRelaxNGParserCtxtPtr = Pointer;
type XmlRelaxNGPtr = Pointer;
type XmlRelaxNGValidCtxtPtr = Pointer;
type XmlSchemaParserCtxtPtr = Pointer;
type XmlSchemaPtr = Pointer;
type XmlSchemaValidCtxtPtr = Pointer;
type XmlStructuredErrorFunc = Pointer;
type XmlXPathCompExprPtr = Pointer;
type XmlXPathContextPtr = Pointer;
type XmlXPathObjectPtr = Pointer;

export class LibXml2 {
    HEAP32: Int32Array;

    HEAPU8: Uint8Array;

    _free(memblock: Pointer): void;
    _malloc(size: number): Pointer;
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
    _xmlFreeParserCtxt(ctxt: XmlParserCtxtPtr): void;
    _xmlDocGetRootElement(doc: XmlDocPtr): XmlNodePtr;
    _xmlFreeDoc(Doc: XmlDocPtr): void;
    _xmlGetLastError(): XmlErrorPtr;
    _xmlGetNsList(doc: XmlDocPtr, node: XmlNodePtr): Pointer;
    _xmlHasNsProp(node: XmlNodePtr, name: CString, namespace: CString): XmlAttrPtr;
    _xmlNewDoc(): XmlDocPtr;
    _xmlNewParserCtxt(): XmlParserCtxtPtr;
    _xmlNodeGetContent(node: XmlNodePtr): CString;
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
    _xmlResetLastError(): void;
    _xmlSearchNs(doc: XmlDocPtr, node: XmlNodePtr, prefix: CString): XmlNsPtr;
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
    // runtime functions
    UTF8ToString(ptr: CString, maxBytesToRead?: number): string;
    addFunction(func: Function, sig: string): Pointer;
    getValue(ptr: Pointer, type: string): number;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: CString, maxBytesToWrite: number): CString;
}

export default function moduleLoader(): Promise<LibXml2>;
