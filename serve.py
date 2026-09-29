"""Local-only static preview with single byte-range support for seeking videos."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re

ROOT = Path(__file__).parent / 'dist'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        self.byte_range = None
        path = Path(self.translate_path(self.path))
        header = self.headers.get('Range')
        if not header or not path.is_file():
            return super().send_head()
        size = path.stat().st_size
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', header)
        if not match or not any(match.groups()):
            self.send_error(400, 'Invalid byte range')
            return None
        left, right = match.groups()
        start = int(left) if left else max(0, size-int(right))
        end = min(int(right), size-1) if left and right else size-1
        if start >= size or end < start:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        file = path.open('rb')
        file.seek(start)
        self.byte_range = (start, end)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Content-Length', str(end-start+1))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        return file

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def copyfile(self, source, output):
        if self.byte_range is None:
            return super().copyfile(source, output)
        remaining = self.byte_range[1]-self.byte_range[0]+1
        while remaining:
            data = source.read(min(65536, remaining))
            if not data:
                break
            output.write(data)
            remaining -= len(data)

if __name__ == '__main__':
    print('FrameFold preview: http://127.0.0.1:8765/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
