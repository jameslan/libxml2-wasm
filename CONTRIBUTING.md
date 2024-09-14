# How to Contribute

## Reporting issues

- Before reporting bugs or filing feature requests,
please search [GitHub Issues](https://github.com/jameslan/libxml2-wasm/issues) first
to ensure it is not reported already.
- Please provide sufficient information to address or reproduce the issue.
Including the version number of libxml2-wasm as well as the environment may help sometimes.
- Please clearly describe the details of the issue or request.
An example would be helpful for other to understand
and a failing testing will be more convenient and precise.

## Pull requests

The CI build will verify test cases, coverage and code style.
All these could run locally by `npm test`.

Besides these checks, please also take care of,

- **Documentation**: every exported API should have docs.
For syntax, please refer to [TypeDoc](https://typedoc.org/guides/doccomments/).
- **Code Coverage**: there's a bar on the code coverage which will cause the CI fail if not met,
but we want it to be as high as possible.
Please check the uncovered lines and branches in the report,
and try to design more test cases to cover them.

## Building

### Environment set up

#### Node.js

The minimum version of Node.js to run libxml2-wasm is 16, but some dev dependencies require Node.js 18+.

#### Emscripten

[Emscripten](https://emscripten.org/) is used to build libxml2 C library into web assembly.
Install it from either git repo or prebuilt package.

#### C toolchain

Autotools etc are used to configure and build the libxml2 C code.
It may need explicit installation for specific platform.

For example on MacOS:

```shell
brew install autoconf automake libtool
brew install pkg-config
```

### Windows

Development on Windows is not directly supported because of the shell command differences.
Please set up the developing environment on `WSL`.

### DevContainer
Alternatively, you can use the provided devcontainer.
When you have an environment running containers,
IDE like VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension. Then you can just run the command "Dev Containers: Reopen in Container" which will provide you a container with the needed development environment. See <https://containers.dev/> for further info.

### Building commands

- `npm run build` builds the project form scratch.
- As long as the C source of libxml2 is not changed, there's no need to re-configure and re-compile it.
To change the exported function in the web assembly, update files in `./binding` directory and run `npm run link`.
- `npm run watch` watches typescript source files and compile them.
