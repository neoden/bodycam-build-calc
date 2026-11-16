"""Inline web/data.js, i18n.js, core.js, app.js into one self-contained HTML. Usage: bundle.py WEB_DIR OUT_HTML
Also stamps the <script src="x.js?v=HASH"> links of the pages in WEB_DIR with the hash of each script, so that a browser
never combines a fresh page with a stale cached script after a deploy."""
import sys, os, re, hashlib
web, out = sys.argv[1], sys.argv[2]
SRC = r'<script src="([^"?]+)(?:\?v=[0-9a-f]+)?"></script>'
def stamp(m):
    h = hashlib.sha1(open(os.path.join(web, m.group(1)), 'rb').read()).hexdigest()[:8]
    return f'<script src="{m.group(1)}?v={h}"></script>'
for page in ('index.html', 'about.html'):
    p = os.path.join(web, page)
    old = open(p, encoding='utf-8').read(); new = re.sub(SRC, stamp, old)
    if new != old: open(p, 'w', encoding='utf-8').write(new)
html = open(os.path.join(web, 'index.html'), encoding='utf-8').read()
def inline(m):
    js = open(os.path.join(web, m.group(1)), encoding='utf-8').read().replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'
html, n = re.subn(SRC, inline, html)
assert n == 4, n
html = html.replace('href="about.html"', 'href="https://neoden.github.io/bodycam-build-calc/about.html" target="_blank" rel="noopener"')
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('bundled', n, 'scripts ->', out, f'{len(html.encode()) // 1024} KB')
