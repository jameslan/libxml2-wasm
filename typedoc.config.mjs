import footnote from 'markdown-it-footnote';

// script to inject version drop down
const github = '<svg width="24" height="24" style="margin-top: 8px;" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" style="fill:currentColor;"></path></svg>'
const script = `
function inject() {
    var toolbar = document.getElementById('tsd-toolbar-links');
    var i;
    for (i = 0; i < toolbar.children.length; i++) {
        var e = toolbar.children[i];
        if (e.text == 'GITHUB') {
            e.innerHTML = '${github}';
        }
    };
    var entry = document.getElementsByClassName('title')[0].href;
    fetch(new URL('../versions.json', entry).href)
        .then(function(resp) {
            return resp.json();
        })
        .then(function(versions) {
            var s = document.createElement('select');
            s.onchange = function(event) {
                window.location.href = event.target.value;
            }
            var i;
            for (i = 0; i < versions.length; i++) {
                var e = new URL('index.html', versions[i].url).href;
                var o = document.createElement('option');
                o.text = versions[i].version;
                o.value = versions[i].url;
                if (e == entry) {
                    o.selected = true;
                }
                s.appendChild(o);
            }
            toolbar.insertBefore(s, toolbar.firstChild);
        });
}
window.onload = inject;
`;

export default {
    entryPoints: ['./src/index.mts', './src/nodejs.mts'],
    preserveLinkText: false,
    visibilityFilters: {
        protected: false,
        private: false,
        inherited: true,
        external: false,
        '@internal': false,
    },
    tsconfig: './tsconfig.prod.json',
    out: './_site',
    navigationLinks: {
        GITHUB: 'https://github.com/jameslan/libxml2-wasm',
    },
    projectDocuments: [
        'docs/tutorial.md',
        'docs/io.md',
        'docs/validate.md',
        'docs/mem.md',
        'docs/performance.md',
    ],
    sortEntryPoints: false,
    readme: 'docs/index.md',
    markdownItLoader(parser) {
        parser.use(footnote);
    },
    customFooterHtml: `<script>${script}</script>`,
}
