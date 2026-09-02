import re, os, base64, mimetypes, sys
ROOT = os.getcwd()
html = open("index.html", encoding="utf-8").read()

def local(p):
    p = p.split("?")[0].strip()
    if p.startswith(("http://","https://","//","data:")): return None
    fp = os.path.join(ROOT, p)
    return fp if os.path.isfile(fp) else None

def datauri(fp):
    mt = mimetypes.guess_type(fp)[0] or "application/octet-stream"
    return "data:%s;base64,%s" % (mt, base64.b64encode(open(fp,"rb").read()).decode())

def inline_css_urls(css, cssdir):
    def rep(m):
        raw = m.group(1).strip().strip('"\'')
        if raw.startswith(("http","data:","#")): return m.group(0)
        fp = os.path.normpath(os.path.join(cssdir, raw.split("?")[0]))
        if os.path.isfile(fp): return "url(%s)" % datauri(fp)
        return m.group(0)
    return re.sub(r'url\(([^)]+)\)', rep, css)

# --- stylesheets ---
def rep_link(m):
    tag = m.group(0)
    if 'rel="stylesheet"' not in tag: 
        return "" if ('icon' in tag or 'manifest' in tag) else tag
    href = re.search(r'href="([^"]+)"', tag)
    fp = local(href.group(1)) if href else None
    if not fp: return tag
    css = open(fp, encoding="utf-8").read()
    css = inline_css_urls(css, os.path.dirname(fp))
    return "<style>\n/* %s */\n%s\n</style>" % (href.group(1), css)
html = re.sub(r'<link\b[^>]*>', rep_link, html)

# --- scripts ---
def rep_script(m):
    src = m.group(1)
    fp = local(src)
    if not fp: return m.group(0)
    js = open(fp, encoding="utf-8").read().replace("</script>", "<\\/script>")
    return "<script>\n/* %s */\n%s\n</script>" % (src, js)
html = re.sub(r'<script\s+src="([^"]+)"\s*>\s*</script>', rep_script, html)

# --- inline <img src> and other local asset refs in HTML ---
def rep_attr(m):
    attr, val = m.group(1), m.group(2)
    fp = local(val)
    if not fp or fp.endswith((".js",".css",".html")): return m.group(0)
    return '%s="%s"' % (attr, datauri(fp))
html = re.sub(r'\b(src|href)="([^"]+)"', rep_attr, html)

# --- strip document skeleton: artifact supplies it ---
head = re.search(r'<head[^>]*>(.*?)</head>', html, re.S)
body = re.search(r'<body[^>]*>(.*?)</body>', html, re.S)
head_inner = head.group(1) if head else ""
body_inner = body.group(1) if body else html
# drop charset/viewport (artifact provides them); keep title + styles
head_inner = re.sub(r'<meta\s+charset[^>]*>', '', head_inner, flags=re.I)
head_inner = re.sub(r'<meta\s+name="viewport"[^>]*>', '', head_inner, flags=re.I)

out = head_inner.strip() + "\n" + body_inner.strip() + "\n"
open("build/preview-bundle.html","w",encoding="utf-8").write(out)
print("bundle bytes:", len(out.encode()))
print("remaining external refs:", sorted(set(re.findall(r'(?:src|href)="(https?://[^"]+)"', out)))[:6])
print("un-inlined local scripts:", re.findall(r'<script\s+src="(?!http)([^"]+)"', out))
