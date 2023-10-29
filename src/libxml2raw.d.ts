type Pointer = number;
type CString = Pointer;
type XmlDocPtr = Pointer;
type XmlNodePtr = Pointer;
type XmlAttrPtr = Pointer;
type XmlXPathContextPtr = Pointer;
type XmlXPathObjectPtr = Pointer;
type XmlErrorPtr = Pointer;
type XmlNsPtr = Pointer;
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
    _xmlXPathFreeContext(context: XmlXPathContextPtr): void;
    _xmlXPathFreeObject(obj: XmlXPathObjectPtr): void;
    _xmlXPathNewContext(doc: XmlDocPtr): XmlXPathContextPtr;
    _xmlXPathNodeEval(
        node: XmlNodePtr,
        xpath: CString,
        context: XmlXPathContextPtr,
    ): XmlXPathObjectPtr;
    _xmlXPathRegisterNs(ctx: XmlXPathContextPtr, prefix: CString, uri: CString): number;

    // runtime functions
    UTF8ToString(ptr: CString, maxBytesToRead?: number): string;
    getValue(ptr: Pointer, type: string): number;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: CString, maxBytesToWrite: number): CString;
}

export default function moduleLoader(): Promise<LibXml2>;
