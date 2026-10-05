import { expect } from 'chai';

import { XmlSaxParser } from '@libxml2-wasm/lib/index.mjs';

/**
 * Consumer example: single-pass extraction from a large document.
 *
 * This spec doubles as documentation of the intended usage pattern of
 * {@link XmlSaxParser}: a small, application-side extractor tracks its
 * position with startElementNs/endElementNs, decodes only the character
 * data it is interested in, and skips a giant embedded text node by
 * looking at `data.length` alone - keeping peak memory flat regardless
 * of the document size. Nothing in this file ships with the library.
 */

interface InvoiceLine {
    id: string;
    quantity: string;
    item: string;
    amount: string;
    currency: string;
}

/** Application-side extractor built on the SAX events. */
class InvoiceExtractor {
    id = '';

    issueDate = '';

    attachmentMimeCode = '';

    /** size of the (skipped) attachment content, in bytes */
    attachmentLength = 0;

    lines: InvoiceLine[] = [];

    /** element names from the document root down to the current element */
    private readonly path: string[] = [];

    /** depth of the <Invoice> element, once found at any depth */
    private invoiceDepth = 0;

    private line: InvoiceLine | null = null;

    private captured: Uint8Array[] | null = null;

    readonly handler = {
        startElementNs: (
            localName: string,
            prefix: string | null,
            namespaceUri: string | null,
            namespaces: [prefix: string | null, uri: string][],
            attributes: { localName: string; value: string }[],
        ): void => {
            this.path.push(localName);
            if (this.invoiceDepth === 0) {
                // the interesting document may be nested in an envelope at any depth
                if (localName === 'Invoice' && namespaceUri === 'urn:invoice') {
                    this.invoiceDepth = this.path.length;
                }
                return;
            }
            switch (this.relativePath()) {
                case 'ID':
                case 'IssueDate':
                case 'Lines/Line/Item':
                case 'Lines/Line/Amount':
                    this.captured = [];
                    break;
                case 'Attachment':
                    this.attachmentMimeCode = attributes
                        .find((a) => a.localName === 'mimeCode')?.value ?? '';
                    break;
                case 'Lines/Line':
                    this.line = {
                        id: attributes.find((a) => a.localName === 'id')?.value ?? '',
                        quantity: attributes.find((a) => a.localName === 'quantity')?.value ?? '',
                        item: '',
                        amount: '',
                        currency: '',
                    };
                    break;
                default:
            }
            if (this.relativePath() === 'Lines/Line/Amount') {
                this.line!.currency = attributes
                    .find((a) => a.localName === 'currency')?.value ?? '';
            }
        },

        endElementNs: (): void => {
            const relative = this.relativePath();
            if (this.captured) {
                const text = decodeConcatenated(this.captured);
                this.captured = null;
                switch (relative) {
                    case 'ID':
                        this.id = text;
                        break;
                    case 'IssueDate':
                        this.issueDate = text;
                        break;
                    case 'Lines/Line/Item':
                        this.line!.item = text;
                        break;
                    case 'Lines/Line/Amount':
                        this.line!.amount = text;
                        break;
                    /* c8 ignore next */
                    default:
                }
            }
            if (relative === 'Lines/Line' && this.line) {
                this.lines.push(this.line);
                this.line = null;
            }
            this.path.pop();
        },

        characters: (data: Uint8Array): void => {
            if (this.captured) {
                // interesting text: copy it out of the wasm memory
                this.captured.push(data.slice());
            } else if (this.relativePath() === 'Attachment') {
                // the giant base64 node: skipping costs one length read
                this.attachmentLength += data.length;
            }
        },
    };

    private relativePath(): string {
        return this.path.slice(this.invoiceDepth).join('/');
    }
}

function decodeConcatenated(chunks: Uint8Array[]): string {
    // character data may be split at arbitrary byte positions:
    // decode the concatenation, not the individual chunks
    const decoder = new TextDecoder();
    return chunks.reduce(
        (text, chunk, i) => text + decoder.decode(chunk, { stream: i < chunks.length - 1 }),
        '',
    );
}

const LINE_COUNT = 2000;
const ATTACHMENT_LENGTH = 20 * 1024 * 1024;

/** Build a ~20MB document: a few small fields, a repeated group and
 * one giant base64 text node, wrapped in an envelope. */
function generateDocument(): Uint8Array {
    const encoder = new TextEncoder();
    const head = encoder.encode(`<?xml version="1.0" encoding="UTF-8"?>
<env:Envelope xmlns:env="urn:envelope"><env:Body><Invoice xmlns="urn:invoice">
<ID>INV-2026-00042</ID><IssueDate>2026-08-08</IssueDate>
<Attachment mimeCode="application/pdf">`);
    const attachment = new Uint8Array(ATTACHMENT_LENGTH).fill(0x41); // base64-like 'A's
    const lines: string[] = ['</Attachment>\n<Lines>'];
    for (let i = 1; i <= LINE_COUNT; i += 1) {
        lines.push(`<Line id="L${i}" quantity="${i % 10}">`
            + `<Item>Widget ${i}</Item>`
            + `<Amount currency="EUR">${i}.00</Amount></Line>`);
    }
    lines.push('</Lines></Invoice></env:Body></env:Envelope>');
    const tail = encoder.encode(lines.join('\n'));
    const doc = new Uint8Array(head.length + attachment.length + tail.length);
    doc.set(head);
    doc.set(attachment, head.length);
    doc.set(tail, head.length + attachment.length);
    return doc;
}

describe('XmlSaxParser streaming extraction (consumer example)', () => {
    it('extracts fields and repeated groups from a ~20MB document with flat memory', () => {
        const document = generateDocument();
        expect(document.length).to.be.greaterThan(20 * 1024 * 1024);

        (global as any).gc();
        const rssBefore = process.memoryUsage().rss;

        const extractor = new InvoiceExtractor();
        using parser = XmlSaxParser.create(extractor.handler);
        // arbitrary chunking, as delivered by a network or file stream
        const chunkSize = 65521;
        for (let offset = 0; offset < document.length; offset += chunkSize) {
            parser.push(document.subarray(offset, offset + chunkSize));
        }
        parser.finish();

        const rssAfter = process.memoryUsage().rss;

        expect(extractor.id).to.equal('INV-2026-00042');
        expect(extractor.issueDate).to.equal('2026-08-08');
        expect(extractor.attachmentMimeCode).to.equal('application/pdf');
        expect(extractor.attachmentLength).to.equal(ATTACHMENT_LENGTH);
        expect(extractor.lines).to.have.lengthOf(LINE_COUNT);
        expect(extractor.lines[0]).to.deep.equal({
            id: 'L1', quantity: '1', item: 'Widget 1', amount: '1.00', currency: 'EUR',
        });
        expect(extractor.lines[LINE_COUNT - 1]).to.deep.equal({
            id: `L${LINE_COUNT}`,
            quantity: `${LINE_COUNT % 10}`,
            item: `Widget ${LINE_COUNT}`,
            amount: `${LINE_COUNT}.00`,
            currency: 'EUR',
        });

        // peak memory stays far below the document size:
        // the giant text node is skipped without being copied or decoded
        expect(rssAfter - rssBefore).to.be.lessThan(16 * 1024 * 1024);
    });
});
