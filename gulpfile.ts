import { exec } from 'node:child_process'
import { TaskFunctionCallback, series } from 'gulp'
import { mkdirSync, rmSync, promises as fs } from 'node:fs'
import { relative } from 'node:path'
import { renderFile } from 'ejs'

const libxmlSrc = 'libxml2'
const libxmlBin = 'out'
const dest = 'lib'
const libxmlWasm = `${libxmlBin}/libxml2.wasm`
const libxmlWrapTemplate = 'build/wrap-wasm.ejs'
const libxmlExportListFile = 'build/wasm-exported.txt'
const libxmlModuleJs = `${libxmlBin}/libxml2.js`

function execInBin(cmd: string[], cb: TaskFunctionCallback) {
    const subprocess = exec(cmd.join(' '), { cwd: libxmlBin }, cb)
    subprocess.stdout?.pipe(process.stdout)
    subprocess.stderr?.pipe(process.stderr)
}

export function clean(cb: TaskFunctionCallback) {
    rmSync(dest, { recursive: true, force: true })
    rmSync(libxmlBin, { recursive: true, force: true })
    cb()
}

export function init(cb: TaskFunctionCallback) {
    mkdirSync(dest, { recursive: true })
    mkdirSync(libxmlBin, { recursive: true })
    cb()
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
    )
}

export function compile(cb: TaskFunctionCallback) {
    execInBin(['emmake', 'make'], cb)
}

export function link(cb: TaskFunctionCallback) {
    execInBin(
        [
            'emcc',
            '-L.libs',
            '-lxml2',
            '-o', 'libxml2.wasm',
            '--no-entry',
            '-s', `EXPORTED_FUNCTIONS=@${relative(libxmlBin, libxmlExportListFile)}`
        ],
        cb,
    )
}

export async function wrap() {
    const wasm = (await fs.readFile(libxmlWasm, {})).toString('base64')
    const exportList = (await fs.readFile(libxmlExportListFile, 'utf-8'))
        .split(/\r?\n/)
        .filter(func => func.trim().length)
        .map(func => func.slice(1))
    const src = await renderFile(libxmlWrapTemplate, { wasm, funcs: exportList })
    await fs.writeFile(libxmlModuleJs, src)
}

export const libxml = series(init, configure, compile)
export const all = series(libxml, link, wrap)
