import * as benny from 'benny';
import { readFileSync } from 'node:fs';
import * as os from 'node:os';
import * as libxmljs2 from 'libxmljs2';
import { XMLParser } from 'fast-xml-parser';
import { XmlDocument } from 'xmldoc';
import { parseXmlString } from 'libxml2-wasm';

console.log(`Environment: NodeJs ${process.version} on ${os.type()} ${os.arch()} ${os.cpus()[0].model}\n`);
for (const fixture of ['fixtures/small.xml', 'fixtures/medium.xml', 'fixtures/large.xml']) {
    const xml = readFileSync(fixture, 'utf-8');
    benny.suite(
        `${fixture}: ${xml.length} chars`,
        benny.add('libxml2-wasm', () => {
            const doc = parseXmlString(xml);
            doc.dispose();
        }),
        benny.add('libxmljs2', () => {
            libxmljs2.parseXmlString(xml);
        }),
        benny.add('fast-xml-parser', () => {
            new XMLParser({ ignoreAttributes: false, processEntities: false}).parse(xml)
        }),
        benny.add('xmldoc', () => {
            new XmlDocument(xml);
        }),
        benny.cycle(),
        benny.complete(() => console.log()),
    )
}
