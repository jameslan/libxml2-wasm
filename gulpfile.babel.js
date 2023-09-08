import { exec } from 'node:child_process';
import { dest, series, src } from 'gulp';
import { mkdirSync, rmSync, promises as fs } from 'node:fs';
import { relative } from 'node:path';
import { argv } from 'yargs';

const libxmlSrc = 'libxml2';
const libxmlBin = 'out';
const destDir = 'lib';
const generated = 'libxml2raw.js';
const libxmlExportListFile = 'build/wasm-exported.txt';

function execInBin(cmd, cb) {
    const subprocess = exec(cmd.join(' '), { cwd: libxmlBin }, cb);
    subprocess.stdout?.pipe(process.stdout);
    subprocess.stderr?.pipe(process.stderr);
}

export function clean(cb) {
    rmSync(destDir, { recursive: true, force: true });
    rmSync(libxmlBin, { recursive: true, force: true });
    cb();
}

export function init(cb) {
    mkdirSync(destDir, { recursive: true });
    mkdirSync(libxmlBin, { recursive: true });
    cb();
}

export function configure(cb) {
    execInBin(
        [
            'emconfigure',
            `${relative(libxmlBin, libxmlSrc)}/autogen.sh`,
            '--without-python',
            '--without-http',
            '--without-sax1',
            '--without-modules',
            '--without-html',
            '--without-threads',
            '--without-zlib',
            '--without-lzma',
            '--disable-shared',
            '--enable-static',
        ],
        cb,
    );
}

export function compile(cb) {
    execInBin(['emmake', 'make'], cb);
}

export function link(cb) {
    const cmd = [
        'emcc',
        '-L.libs',
        '-lxml2',
        '-o', generated,
        '--no-entry',
        '-s', 'MODULARIZE',
        '-s', 'EXPORTED_RUNTIME_METHODS=lengthBytesUTF8,stringToUTF8',
        '-s', `EXPORTED_FUNCTIONS=@${relative(libxmlBin, libxmlExportListFile)}`,
    ];

    // debug build?
    if (argv.g) {
        cmd.push('-g');
    } else {
        cmd.push('-s', 'SINGLE_FILE');
    }

    execInBin(
        cmd,
        cb,
    );
}

export function collect() {
    return src('./out/libxml2raw.js')
        .pipe(dest(destDir));
}

export const libxml = series(init, configure, compile);
export const all = series(libxml, link, collect);
export const rebuild = series(clean, all);
