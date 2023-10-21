type Pointer = number;
type CString = Pointer;
type XmlDocPtr = Pointer;
type XmlNodePtr = Pointer;
type XmlAttrPtr = Pointer;
type XmlXPathContextPtr = Pointer;
type XmlXPathObjectPtr = Pointer;
type XmlErrorPtr = Pointer;
export class LibXml2 {
    HEAP32: Int32Array;

    HEAPU8: Uint8Array;

    getValue(ptr: Pointer, type: string): number;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: CString, maxBytesToWrite: number): CString;
    UTF8ToString(ptr: CString, maxBytesToRead?: number): string;
    _xmlNewDoc(): XmlDocPtr;
    _xmlFreeDoc(Doc: XmlDocPtr): void;
    _xmlReadMemory(
        buffer: CString,
        length: number,
        url: CString,
        encoding: CString,
        options: number,
    ): XmlDocPtr;
    _malloc(size: number): Pointer;
    _free(memblock: Pointer): void;
    _xmlXPathNewContext(doc: XmlDocPtr): XmlXPathContextPtr;
    _xmlXPathFreeContext(context: XmlXPathContextPtr): void;
    _xmlXPathNodeEval(
        node: XmlNodePtr,
        xpath: CString,
        context: XmlXPathContextPtr,
    ): XmlXPathObjectPtr;
    _xmlXPathFreeObject(obj: XmlXPathObjectPtr): void;
    _xmlDocGetRootElement(doc: XmlDocPtr): XmlNodePtr;
    _xmlHasProp(node: XmlNodePtr, name: CString): XmlAttrPtr;
    _xmlNodeGetContent(node: XmlNodePtr): CString;
    _xmlGetLastError(): XmlErrorPtr;
    _xmlResetLastError(): void;
    _xmlXPathRegisterNs(ctx: XmlXPathContextPtr, prefix: CString, uri: CString): number;
}

export default function moduleLoader(): Promise<LibXml2>;
