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

- **Node.js 18+** (minimum 16, but dev dependencies require 18+)
- **Emscripten SDK** (compiles libxml2 C to WebAssembly)
- **C toolchain:** autoconf, automake, libtool, pkg-config

### Option 1: DevContainer (Recommended for Windows)

Provides pre-configured environment with all dependencies.

**VS Code:**
1. Install Docker Desktop and [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
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
- **Ubuntu/Debian:** `sudo apt-get install autoconf automake libtool pkg-config`
- **Fedora/Enterprise Linux:** `sudo dnf install autoconf automake libtool pkg-config`

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

**Windows:** Use DevContainer (Option 1) or WSL 2 with Linux instructions. Native Windows is not supported due to shell command differences.

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

### Adding Exported Functions

When exposing new libxml2 C functions (editing `binding/exported-functions.txt` or `binding/exported-runtime-functions.txt`):



## Exporting libxml2 Functions

Two files control WASM exports:

### `binding/exported-functions.txt`
Lists libxml2 C functions (with underscore prefix per Emscripten convention):
```
_xmlNewDoc
_xmlAddChild
_xmlFreeDoc
```

### `binding/exported-runtime-functions.txt`
Lists Emscripten runtime functions for memory management:
```
HEAP32
UTF8ToString
addFunction
```

**Adding new functions:**
1. Find the function in [libxml2 docs](https://gnome.pages.gitlab.gnome.org/libxml2/html/index.html)
2. Add to `binding/exported-functions.txt` with underscore: `_xmlFunctionName`
3. `npm run link` to relink WASM
4. Add TypeScript wrapper in `src/libxml2.mts`
5. Write tests in `test/`
6. Run `npm test` to verify everything works

## Debugging & Best Practices

**TypeScript debugging:** Source maps enabled. Use VS Code debugger or `node --inspect-brk`. [debugging](https://nodejs.org/en/learn/getting-started/debugging)

**Prevent memory leaks:** Always use `using` keyword or call `.dispose()`:
```typescript
using doc = XmlDocument.fromString('<root/>');
// Automatically disposed
```

## Troubleshooting

**"emcc: command not found"**  
→ Activate Emscripten: `source /path/to/emsdk/emsdk_env.sh`

---

Questions? [GitHub Discussions](https://github.com/jameslan/libxml2-wasm/discussions) | Bugs? [GitHub Issues](https://github.com/jameslan/libxml2-wasm/issues)
