(function() {
    document.addEventListener('DOMContentLoaded', function() {
        var entry = document.getElementsByClassName('title')[0].href;
        fetch(new URL('../versions.json', entry).href).then(function(resp) {
            return resp.json();
        }).then(function(versions) {
            var sel = document.getElementById('version-select');
            var i;
            for (i = 0; i < versions.length; i++) {
                var e = new URL('index.html', versions[i].url).href;
                var o = document.createElement('option');
                o.text = versions[i].version;
                o.value = versions[i].url;
                if (e == entry) {
                    o.selected = true;
                }
                sel.appendChild(o);
            }
            sel.addEventListener('change', function(event) {
                window.location.href = event.target.value;
            });
            sel.classList.remove('loading');
        });
    });
})()
