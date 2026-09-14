import { expect } from 'chai';

import { XmlParseError, XmlSaxParser } from '@libxml2-wasm/lib/index.mjs';

const encoder = new TextEncoder();

const ITERATIONS = 16;

/**
 * A document declaring a 4MB entity in its internal subset, cut short after the
 * first element: even in SAX mode, libxml2 keeps the entities it parsed in a
 * document of its own, and releases it only when the parse runs to its end.
 */
const prologue = encoder.encode(
    `<!DOCTYPE d [<!ENTITY big "${'x'.repeat(4 * 1024 * 1024)}">]><d><a/>`,
);

function rss(): number {
    (global as any).gc();
    return process.memoryUsage().rss;
}

/**
 * Memory still held after running `parse` `ITERATIONS` times.
 * The first run is untimed and unmeasured: it grows the WebAssembly heap to the
 * size this document needs, which would otherwise be charged to the caller.
 */
function retained(parse: () => void): number {
    parse();
    const before = rss();
    for (let i = 0; i < ITERATIONS; i += 1) {
        parse();
    }
    return rss() - before;
}

describe('XmlSaxParser memory', () => {
    // without the release of the entity store in xmlFreeSaxParserCtxt, every
    // iteration leaks its 4MB entity, i.e. >100MB over the loop
    const budget = 32 * 1024 * 1024;

    it('releases everything of a stopped parse', () => {
        expect(retained(() => {
            using parser = XmlSaxParser.create({
                startElementNs: (localName) => {
                    if (localName === 'a') {
                        parser.stop();
                    }
                },
            });
            parser.push(prologue);
        })).to.be.lessThan(budget);
    }).timeout(20000);

    it('releases everything of a failed parse', () => {
        expect(retained(() => {
            using parser = XmlSaxParser.create({});
            parser.push(prologue);
            expect(() => parser.push(encoder.encode('</wrong>'))).to.throw(XmlParseError);
        })).to.be.lessThan(budget);
    }).timeout(20000);

    it('releases everything of a parse that is never finished', () => {
        expect(retained(() => {
            using parser = XmlSaxParser.create({});
            parser.push(prologue);
        })).to.be.lessThan(budget);
    }).timeout(20000);
});
