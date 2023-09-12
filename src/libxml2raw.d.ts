type Pointer = number;
export class LibXml2 {
    lengthBytesUTF8(str: string): number;
    stringToUTF8(str: string, outPtr: Pointer, maxBytesToWrite: number): Pointer;
    _xmlNewDoc(): Pointer;
    _xmlFreeDoc(xmlDocPtr: Pointer);
    _xmlReadMemory(buffer: Pointer, length: number, url: Pointer, encoding: Pointer, options: number);
    _malloc(size: number): Pointer;
    _free(memblock: Pointer);
}

export default function module_loader(): Promise<LibXml2>;
