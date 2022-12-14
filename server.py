#!/usr/bin/env python
import sys

import mimetypes

mimetypes.init()

if ".wasm" not in mimetypes.types_map:
    print(
        "WARNING: wasm mimetype unsupported on that system, trying to correct",
        file=sys.stderr,
    )
    mimetypes.types_map[".wasm"] = "application/wasm"

import argparse
from http import server, HTTPStatus

import io
import os

import urllib
import urllib.request

from pathlib import Path
import hashlib

CWD = os.getcwd()


parser = argparse.ArgumentParser(
    description="Start a local webserver with a Python terminal."
)
parser.add_argument(
    "--port", type=int, default=8000, help="port for the http server to listen on"
)
args = parser.parse_args()


CACHE = Path("cache")
CACHE.mkdir(parents=True, exist_ok=True)

class MyHTTPRequestHandler(server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cross-Origin-Opener-Policy", "unsafe-none")
        self.send_header("Cross-Origin-Embedder-Policy", "unsafe-none")
        super().end_headers()

    def do_GET(self):
        f = self.send_head()
        if f:
            try:
                self.copyfile(f, self.wfile)
            finally:
                f.close()

    def do_HEAD(self):
        f = self.send_head()
        if f:
            f.close()

    def send_head(self):
        path = self.translate_path(self.path)

        ctype = self.guess_type(path)
        content = b''

        def flush():
            nonlocal ctype
            nonlocal content
            self.send_header("content-type", ctype)
            self.send_header("content-length", str(len(content)))
            self.end_headers()
            return io.BytesIO(content)



        if self.path.endswith('.map'):
            self.send_response(404)
            self.send_header("content-length", 0)
            self.end_headers()
            return io.BytesIO(b'')

        if os.path.isdir(path):
            parts = urllib.parse.urlsplit(self.path)
            if not parts.path.endswith("/"):
                # redirect browser - doing basically what apache does
                self.send_response(HTTPStatus.MOVED_PERMANENTLY)
                new_parts = (parts[0], parts[1], parts[2] + "/", parts[3], parts[4])
                new_url = urllib.parse.urlunsplit(new_parts)
                self.send_header("Location", new_url)
                self.end_headers()
                return None
            for index in "index.html", "index.htm":
                index = os.path.join(path, index)
                if os.path.exists(index):
                    path = index
                    break
            else:
                return self.list_directory(path)

        if not Path(path).is_file():
            self.send_response(404)
            return flush()

        self.send_response(HTTPStatus.OK)

        if self.path.startswith('/cors/'):
            ctype = 'text/plain; charset=utf-8'

            target = self.path[6:]
            print("CORS:", target)
            cache = CACHE / hashlib.md5(target.encode()).hexdigest()
            if cache.is_file():
                path = cache
            else:
                if target.startswith('https://paste.pythondiscord.com/'):
                    if not target.count('/raw/'):
                        target = target.replace('https://paste.pythondiscord.com/','https://paste.pythondiscord.com/raw/',1)
                else:
                    content = f'print("Unsupported paste service")'.encode()
                    return flush()

                path, headers = urllib.request.urlretrieve(target, cache)

        with open(path, "rb") as file:
            content = file.read()
            if Path(path).suffix in [".html"]:
                content = content.replace(
                    b"https://pygame-web.github.io/", b"http://localhost:8000/"
                )

        return flush()



server.test(HandlerClass=MyHTTPRequestHandler, protocol="HTTP/1.1", port=args.port)
