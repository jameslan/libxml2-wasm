import { exec } from 'node:child_process';
import { TaskFunctionCallback, series } from 'gulp';
import { mkdirSync, rmSync, promises as fs } from 'node:fs';
import { relative } from 'node:path';
import { argv } from 'yargs';

const libxmlSrc = 'libxml2';
const libxmlBin = 'out';
const dest = 'lib';
const libxmlExportListFile = 'build/wasm-exported.txt';

function execInBin(cmd: string[], cb: TaskFunctionCallback) {
    const subprocess = exec(cmd.join(' '), { cwd: libxmlBin }, cb);
    subprocess.stdout?.pipe(process.stdout);
    subprocess.stderr?.pipe(process.stderr);
}

export function clean(cb: TaskFunctionCallback) {
    rmSync(dest, { recursive: true, force: true });
    rmSync(libxmlBin, { recursive: true, force: true });
    cb();
}

export function init(cb: TaskFunctionCallback) {
    mkdirSync(dest, { recursive: true });
    mkdirSync(libxmlBin, { recursive: true });
    cb();
}

export function configure(cb: TaskFunctionCallback) {
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

export function compile(cb: TaskFunctionCallback) {
    execInBin(['emmake', 'make'], cb);
}

export function link(cb: TaskFunctionCallback) {
    const cmd = [
        'emcc',
        '-L.libs',
        '-lxml2',
        '-o', 'libxml2.js',
        '--no-entry',
        '-s', 'MODULARIZE',
        '-s', `EXPORTED_FUNCTIONS=@${relative(libxmlBin, libxmlExportListFile)}`,
    ];

    // debug build?
    if ((argv as any).g) {
        cmd.push('-g');
    } else {
        cmd.push('-s', 'SINGLE_FILE');
    }

    execInBin(
        cmd,
        cb,
    );
}

export const libxml = series(init, configure, compile);
export const all = series(libxml, link);
export const rebuild = series(clean, all);
