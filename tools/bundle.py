"""Inline web/data.js, i18n.js, core.js, app.js into one self-contained HTML. Usage: bundle.py WEB_DIR OUT_HTML"""
import sys, os, re
web, out = sys.argv[1], sys.argv[2]
html = open(os.path.join(web, 'index.html'), encoding='utf-8').read()
def inline(m):
    js = open(os.path.join(web, m.group(1)), encoding='utf-8').read().replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'
html, n = re.subn(r'<script src="([^"]+)"></script>', inline, html)
assert n == 4, n
html = html.replace('href="about.html"', 'href="https://neoden.github.io/bodycam-build-calc/about.html" target="_blank" rel="noopener"')
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('bundled', n, 'scripts ->', out, f'{len(html.encode()) // 1024} KB')
