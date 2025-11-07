# How to Contribute

## Reporting Issues

- Search [GitHub Issues](https://github.com/jameslan/libxml2-wasm/issues) first to avoid duplicates
- Provide sufficient information: version, environment, steps to reproduce
- Include failing test cases when possible

## Pull Requests

The CI build verifies tests, coverage, and code style. Run locally with `npm test`.

**Requirements:**

- **Documentation:** Every exported API needs [TypeDoc](https://typedoc.org/guides/doccomments/) comments
- **Code Coverage:** 98% lines, 90% branches - check `coverage/lcov-report/index.html`
- **Linting:** Must pass ESLint (Airbnb TypeScript config)

## Environment Setup

### Prerequisites

- **Node.js 18+**
- **Emscripten SDK** (compiles libxml2 C to WebAssembly)
- **C toolchain:** autoconf, automake, libtool, pkg-config

### Option 1: DevContainer (Recommended for Windows)

Provides pre-configured environment with all dependencies.

**VS Code:**

1. Install Docker Desktop
   and [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Clone and open repository:
   ```bash
   git clone https://github.com/jameslan/libxml2-wasm.git
   code libxml2-wasm
   ```
3. Press `F1` → "Dev Containers: Reopen in Container"
4. Wait for setup to complete (auto-initializes submodules and installs dependencies)

**WebStorm/IntelliJ:** See [DevContainer docs](https://www.jetbrains.com/help/webstorm/connect-to-devcontainer.html)

### Option 2: Native Setup

**Install C toolchain:**

- **macOS:** `brew install autoconf automake libtool pkg-config`
- **Ubuntu/Debian:** `sudo apt-get install autoconf automake libtool pkg-config libatomic1`
- **Fedora/Enterprise Linux:** `sudo dnf install autoconf automake libtool pkg-config libatomic`

**Install Emscripten:**

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

**Build:**

```bash
git clone https://github.com/jameslan/libxml2-wasm.git
cd libxml2-wasm
git submodule update --init --recursive
npm install
npm run build
```

**Windows:** Use DevContainer (Option 1) or WSL 2 with Linux instructions. Native Windows is not supported due to shell
command differences.

## Development Workflows

### Build

Run the full build after cloning or when changing libxml2 configuration:

```bash
npm run build     # Full build: WASM + TypeScript
npm test          # Verify everything works
```

This compiles libxml2 C code into WebAssembly and TypeScript into JavaScript.

---

### TypeScript Development

**Most common workflow** - editing `src/*.mts` or `test/**/*.mts`:

```bash
npm run watch     # Auto-recompile TypeScript on save
# OR
npm run tsc       # Compile TypeScript once
# and always
npm test          # Tests + coverage + linting
```

---

## Exporting libxml2 Functions

Two files control WASM exports:

### `binding/exported-functions.txt`

Lists libxml2 C functions (with underscore prefix per Emscripten convention):

```
_xmlNewDoc
_xmlAddChild
_xmlFreeDoc
...
```

### `binding/exported-runtime-functions.txt`

Lists Emscripten runtime functions for memory management:

```
HEAP32
UTF8ToString
addFunction
...
```

**Adding new functions:**

1. Find the function in [libxml2 docs](https://gnome.pages.gitlab.gnome.org/libxml2/html/index.html)
2. Add to `binding/exported-functions.txt` with underscore: `_xmlFunctionName`
3. `npm run link` to relink WASM
4. Add TypeScript wrapper in `src/libxml2.mts`
5. Write tests in `test/`
6. Build and run tests to verify everything works

## Debugging & Best Practices

### Never Create Multiple WASM Module Instances

Each call to `moduleLoader()` creates a new WASM module instance with its own separate memory space. Pointers from one
instance won't work in another.

**Incorrect approach:**

```typescript
// -- mynewfeature.mts --
import {xmlSaveDoc} from './libxml2.mjs';
import moduleLoader from "./libxml2raw.mjs";
import {XmlDocument} from './document.mjs';

const libxml2 = await moduleLoader(); // Creates a NEW instance of libxml2 with its own memory space
const ptr = libxml2._malloc(100);  // Memory in NEW instance

const doc = XmlDocument.fromString('<root/>'); // This uses the "global" instance of libxml2

xmlSaveDoc(ptr, doc._ptr); // FAIL: the ptr and the doc are from different instances
```

---

### TypeScript Debugging

**VS Code:** Three launch configurations are available in `.vscode/launch.json`:

1. **Mocha: All Tests** - Debug all tests
2. **Mocha: Current File** - Debug a single test file
3. **Mocha: Grep Tests** - Debug specific tests by name pattern

**WebStorm/IntelliJ:** Works out of the box with the built-in debugger.

---

### WASM/C Debugging

To debug the libxml2 C code build the debug version:

```bash
npm run build:debug    # Build WASM with debug symbols (-g) and no optimizations (-O0)
```

**VS Code DevContainer:** Works by default. You can step through and set breakpoints in C code directly.

**Local VS Code setup:** Install
the [WebAssembly DWARF Debugging](https://marketplace.visualstudio.com/items?itemName=ms-vscode.wasm-dwarf-debugging)
extension for C code debugging support.

**WebStorm/IntelliJ:** Not supported at this time.

---

### Prevent Memory Leaks

Always use `using` keyword or call `.dispose()`:

```typescript
using doc = XmlDocument.fromString('<root/>');
// Automatically disposed
```

## Troubleshooting

**"emcc: command not found"**  
→ Activate Emscripten: `source /path/to/emsdk/emsdk_env.sh`

---

Questions? [GitHub Discussions](https://github.com/jameslan/libxml2-wasm/discussions) |
Bugs? [GitHub Issues](https://github.com/jameslan/libxml2-wasm/issues)
