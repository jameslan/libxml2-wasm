/**
 * A side module for Node.js user only.
 *
 * ```ts
 * import { <symbol> } from 'libxml2-wasm/lib/nodejs.mjs';
 * ```
 *
 * @packageDocumentation
 */
import fs from 'node:fs';
import { XmlInputProvider, xmlRegisterInputProvider } from './libxml2.mjs';

function filePath(filename: string): string | null {
    try {
        const url = new URL(filename);
        return url.protocol === 'file:' ? url.pathname : null;
    } catch {
        return filename;
    }
}

function fileExists(filename: string): boolean {
    const filepath = filePath(filename);
    return filepath != null && fs.existsSync(filepath);
}

/**
 * The virtual IO input providers using the fs module in Node.js.
 *
 * It supports file path (`path/to/file.xml`) or file url (`file:///path/to/file.xml`).
 *
 * @see {@link libxml2-wasm!xmlRegisterInputProvider}
 */
export const fsInputProviders: XmlInputProvider = {
    match(filename: string) {
        return fileExists(filename);
    },

    open(filename: string) {
        const filepath = filePath(filename);
        if (filepath == null) {
            return undefined;
        }
        try {
            return fs.openSync(filepath, 'r');
        } catch {
            return undefined;
        }
    },

    read(fd: number, buf: Uint8Array) {
        try {
            return fs.readSync(fd, buf, 0, buf.byteLength, null);
        } catch {
            return -1;
        }
    },

    close(fd: number) {
        try {
            fs.closeSync(fd);
        } catch {
            // ignore exception in closing file
        }
        return true;
    },
};

/**
 * Register {@link fsInputProviders}.
 *
 * @see {@link libxml2-wasm!xmlRegisterInputProvider}
 */
export function xmlRegisterFsInputProviders(): boolean {
    return xmlRegisterInputProvider(fsInputProviders);
}
