type Pointer = number;
type CString = Pointer;
type XmlAttrPtr = Pointer;
type XmlDocPtr = Pointer;
type XmlErrorPtr = Pointer;
type XmlNodePtr = Pointer;
type XmlNsPtr = Pointer;
type XmlSchemaParserCtxtPtr = Pointer;
type XmlSchemaPtr = Pointer;
type XmlSchemaValidCtxtPtr = Pointer;
type XmlXPathCompExprPtr = Pointer;
type XmlXPathContextPtr = Pointer;
type XmlXPathObjectPtr = Pointer;

export class LibXml2 {
    HEAP32: Int32Array;

    HEAPU8: Uint8Array;

    _free(memblock: Pointer): void;
    _malloc(size: number): Pointer;
    _xmlDocGetRootElement(doc: XmlDocPtr): XmlNodePtr;
    _xmlFreeDoc(Doc: XmlDocPtr): void;
    _xmlGetLastError(): XmlErrorPtr;
    _xmlGetNsList(doc: XmlDocPtr, node: XmlNodePtr): Pointer;
    _xmlHasNsProp(node: XmlNodePtr, name: CString, namespace: CString): XmlAttrPtr;
    _xmlNewDoc(): XmlDocPtr;
    _xmlNodeGetContent(node: XmlNodePtr): CString;
    _xmlReadMemory(
        buffer: CString,
        length: number,
        url: CString,
        encoding: CString,
        options: number,
    ): XmlDocPtr;
    _xmlResetLastError(): void;
    _xmlSearchNs(doc: XmlDocPtr, node: XmlNodePtr, prefix: CString): XmlNsPtr;
    _xmlXPathCompile(str: CString): XmlXPathCompExprPtr;
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
    _xmlSchemaValidateDoc(ctx: XmlSchemaValidCtxtPtr, doc: XmlDocPtr): number;
    // runtime functions
    UTF8ToString(ptr: CString, maxBytesToRead?: number): string;
    getValue(ptr: Pointer, type: string): number;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: CString, maxBytesToWrite: number): CString;
}

export default function moduleLoader(): Promise<LibXml2>;
