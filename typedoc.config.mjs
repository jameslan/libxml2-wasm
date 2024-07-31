import footnote from 'markdown-it-footnote';
export default {
    "entryPoints": ["./src/index.mts"],
    "preserveLinkText": false,
    "visibilityFilters": {
        "protected": false,
        "private": false,
        "inherited": true,
        "external": false,
        "@internal": false
    },
    "tsconfig": "./tsconfig.prod.json",
    "out": "./_site",
    "navigationLinks": {
        "GITHUB": "https://github.com/jameslan/libxml2-wasm"
    },
    "projectDocuments": [
        "docs/tutorial.md",
        "docs/mem.md",
        "docs/performance.md"
    ],
    "sortEntryPoints": false,
    "readme": "docs/index.md",
    markdownItLoader(parser) {
        parser.use(footnote);
    },
}
