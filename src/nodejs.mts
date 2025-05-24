/**
 * A side module for Node.js users only.
 *
 * ```ts
 * import { <symbol> } from 'libxml2-wasm/lib/nodejs.mjs';
 * ```
 *
 * @packageDocumentation
 */
import fs from 'node:fs';
import { SaveOptions, XmlInputProvider, xmlRegisterInputProvider } from './libxml2.mjs';
import { XmlDocument } from './document.mjs';

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
 * The virtual IO input providers for file operations in Node.js,
 * utilizing the `node:fs` module.
 *
 * These providers support both file paths (e.g., `path/to/file.xml`)
 * and file URLs (e.g., `file:///path/to/file.xml`).
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

/**
 * Synchronously save the {@link XmlDocument} to a file.
 * @param doc The XmlDocument to be saved.
 * @param fd The file descriptor returned by `fs.open` or `fs.openSync`, etc.
 * @param options Options for saving.
 */
export function saveDocSync(doc: XmlDocument, fd: number, options?: SaveOptions) {
    const handler = {
        fd,

        write(buf: Uint8Array) {
            return fs.writeSync(this.fd, buf);
        },

        close(): boolean {
            fs.closeSync(this.fd);
            return true;
        },
    };
    doc.save(handler, options);
}
