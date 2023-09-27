type Pointer = number;
type XmlDocPtr = Pointer;
type XmlNodePtr = Pointer;
type XmlXPathContextPtr = Pointer;
type XmlXPathObjectPtr = Pointer;

export class LibXml2 {
    getValue(ptr: Pointer, type: string): number;
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: Pointer, maxBytesToWrite: number): Pointer;
    UTF8ToString(ptr: Pointer, maxBytesToRead?: number): string;
    _xmlNewDoc(): XmlDocPtr;
    _xmlFreeDoc(Doc: XmlDocPtr);
    _xmlReadMemory(
        buffer: Pointer,
        length: number,
        url: Pointer,
        encoding: Pointer,
        options: number,
    ): XmlDocPtr;
    _malloc(size: number): Pointer;
    _free(memblock: Pointer);
    _xmlXPathNewContext(doc: XmlDocPtr): XmlXPathContextPtr;
    _xmlXPathFreeContext(context: XmlXPathContextPtr);
    _xmlXPathNodeEval(
        node: XmlNodePtr,
        xpath: Pointer,
        context: XmlXPathContextPtr,
    ): XmlXPathObjectPtr;
    _xmlDocGetRootElement(doc: XmlDocPtr): XmlNodePtr;
}

export default function module_loader(): Promise<LibXml2>;
