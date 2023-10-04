type Pointer = number;
type CString = Pointer;
type XmlDocPtr = Pointer;
type XmlNodePtr = Pointer;
type XmlAttrPtr = Pointer;
type XmlXPathContextPtr = Pointer;
type XmlXPathObjectPtr = Pointer;

export class LibXml2 {
    getValue(ptr: Pointer, type: string): number;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: CString, maxBytesToWrite: number): CStrng;
    UTF8ToString(ptr: CString, maxBytesToRead?: number): string;
    _xmlNewDoc(): XmlDocPtr;
    _xmlFreeDoc(Doc: XmlDocPtr);
    _xmlReadMemory(
        buffer: CString,
        length: number,
        url: CString,
        encoding: CString,
        options: number,
    ): XmlDocPtr;
    _malloc(size: number): Pointer;
    _free(memblock: Pointer);
    _xmlXPathNewContext(doc: XmlDocPtr): XmlXPathContextPtr;
    _xmlXPathFreeContext(context: XmlXPathContextPtr);
    _xmlXPathNodeEval(
        node: XmlNodePtr,
        xpath: CString,
        context: XmlXPathContextPtr,
    ): XmlXPathObjectPtr;
    _xmlDocGetRootElement(doc: XmlDocPtr): XmlNodePtr;
    _xmlHasProp(node: XmlNodePtr, name: CString): XmlAttrPtr;
}

export default function moduleLoader(): Promise<LibXml2>;
