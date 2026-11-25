import http.server, sys, os
root = sys.argv[1]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
    def translate_path(self, path):
        p = super().translate_path(path)
        # GitHub Pages serves /x from x.html
        if not os.path.exists(p) and os.path.exists(p + '.html'): return p + '.html'
        return p
    def end_headers(self):
        self.send_header('Cache-Control', 'max-age=600')
        super().end_headers()
    def log_message(self, f, *a): sys.stderr.write((f % a) + '\n')
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), H).serve_forever()
