type Pointer = number;
type XmlDocPtr = Pointer;
type XmlNodePtr = Pointer;
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
        options: number): XmlDocPtr;
    _malloc(size: number): Pointer;
    _free(memblock: Pointer);
    _xmlXPathNewContext();
    _xmlXPathFreeContext();
    _xmlDocGetRootElement(doc: XmlDocPtr): XmlNodePtr;
}

export default function module_loader(): Promise<LibXml2>;
