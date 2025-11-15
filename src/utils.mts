import {
    DisposableMalloc,
    lengthBytesUTF8, setValue, stringToUTF8, XmlInputProvider, XmlOutputBufferHandler,
} from './libxml2.mjs';
import { Pointer } from './libxml2raw.mjs';

const bufferContexts: Map<number, [Uint8Array, number]> = new Map();
let contextIndex = 1;

/**
 * A XmlInputProvider implementation that reads from buffers.
 *
 * This can be passed to {@link xmlRegisterInputProvider} to read XML content from memory.
 */
export class XmlBufferInputProvider implements XmlInputProvider {
    private _data: Record<string, Uint8Array>;

    /**
     * Create a new XmlBufferInputProvider with a set of buffers.
     * @param data The buffers by their filename.
     */
    constructor(data: Record<string, Uint8Array>) {
        this._data = data;
    }

    /**
     * Add a buffer to the provider.
     * @param filename The filename of the buffer.
     * @param buffer The buffer to add.
     */
    addBuffer(filename: string, buffer: Uint8Array) {
        this._data[filename] = buffer;
    }

    /**
     * Remove a buffer from the provider.
     * @param filename The filename of the buffer to remove.
     */
    removeBuffer(filename: string) {
        delete this._data[filename];
    }

    match(filename: string): boolean {
        return this._data[filename] != null;
    }

    open(filename: string): number {
        return openBuffer(this._data[filename]);
    }

    read(fd: number, buffer: Uint8Array): number { // eslint-disable-line class-methods-use-this
        return readBuffer(fd, buffer);
    }

    close(fd: Pointer): boolean { // eslint-disable-line class-methods-use-this
        closeBuffer(fd);
        return true;
    }
}

/**
 * Open a buffer for reading.
 * @param buffer The buffer to read from.
 * @returns The file descriptor for the buffer reader.
 */
export function openBuffer(buffer: Uint8Array): number {
    const fd = contextIndex;
    bufferContexts.set(fd, [buffer, 0]);
    contextIndex += 1;
    return fd;
}

/**
 * Read from the buffer.
 * @param fd The file descriptor for the buffer reader.
 * @param buffer The buffer to read into.
 * @returns The number of bytes read.
 */
export function readBuffer(fd: number, buffer: Uint8Array): number {
    const context = bufferContexts.get(fd);
    if (context == null) {
        return -1;
    }

    const [data, offset] = context;
    const length = Math.min(buffer.byteLength, data.byteLength - offset);
    buffer.set(data.slice(offset, offset + length));
    context[1] += length;
    return length;
}

/**
 * Close the buffer reader.
 * @param fd The file descriptor for the buffer reader.
 */
export function closeBuffer(fd: Pointer) {
    bufferContexts.delete(fd);
}

export class XmlStringOutputBufferHandler implements XmlOutputBufferHandler {
    private _result = '';

    private _decoder = new TextDecoder();

    write(buf: Uint8Array): number {
        this._result += this._decoder.decode(buf);
        return buf.byteLength;
    }

    close(): boolean { // eslint-disable-line class-methods-use-this
        return true;
    }

    get result(): string {
        return this._result;
    }
}

/**
 * Helper to create a C-style array of C strings
 */
export class CStringArrayWrapper extends DisposableMalloc {
    private cStrings: DisposableMalloc[] = [];

    constructor(strings: string[]) {
        // allocate pointer array (+1 for NULL terminator)
        super((strings.length + 1) * 4);

        this.cStrings = strings.map((s) => {
            const len = lengthBytesUTF8(s) + 1;
            const mem = new DisposableMalloc(len);
            stringToUTF8(s, mem._ptr, len);
            return mem;
        });

        this.cStrings.forEach(({ _ptr }, i) => {
            setValue(this._ptr + i * 4, _ptr, 'i32');
        });
        setValue(this._ptr + this.cStrings.length * 4, 0, 'i32');
    }

    [Symbol.dispose](): void {
        this.cStrings.forEach((dm) => dm.dispose());
        super[Symbol.dispose]();
    }
}
