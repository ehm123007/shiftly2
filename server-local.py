#!/usr/bin/env python3
"""
Zero-dependency Python local server for Shiftly Workforce Platform.
Compatible with Python 3 on Windows, macOS, and Linux.
"""

import os
import sys
import webbrowser
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(os.environ.get('PORT', 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_web_root():
    candidates = [
        os.path.join(BASE_DIR, 'dist'),
        BASE_DIR,
        os.path.join(os.getcwd(), 'dist'),
        os.getcwd()
    ]
    for c in candidates:
        if os.path.exists(os.path.join(c, 'index.html')) or os.path.exists(os.path.join(c, 'app.html')):
            return c
    return BASE_DIR

DIRECTORY = get_web_root()

class SPAServerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        try:
            # Serve project zip if requested
            if self.path.endswith('.zip'):
                zip_candidates = [
                    os.path.join(BASE_DIR, os.path.basename(self.path)),
                    os.path.join(BASE_DIR, 'public', os.path.basename(self.path)),
                    os.path.join(BASE_DIR, 'dist', os.path.basename(self.path))
                ]
                for zp in zip_candidates:
                    if os.path.exists(zp):
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/zip')
                        self.send_header('Content-Length', str(os.path.getsize(zp)))
                        self.end_headers()
                        with open(zp, 'rb') as f:
                            self.wfile.write(f.read())
                        return

            req_path = self.path.split('?')[0].lstrip('/').replace('/', os.sep)
            full_path = os.path.join(DIRECTORY, req_path)

            # Asset resolution fallback
            if 'assets' in req_path and not os.path.exists(full_path):
                asset_name = os.path.basename(req_path)
                alt_asset = os.path.join(BASE_DIR, 'assets', asset_name)
                if os.path.exists(alt_asset):
                    self.send_response(200)
                    if asset_name.endswith('.js'):
                        self.send_header('Content-Type', 'application/javascript; charset=UTF-8')
                    elif asset_name.endswith('.css'):
                        self.send_header('Content-Type', 'text/css; charset=UTF-8')
                    self.end_headers()
                    with open(alt_asset, 'rb') as f:
                        self.wfile.write(f.read())
                    return

            # SPA Fallback: if file does not exist, serve index.html or app.html
            if not os.path.exists(full_path) or os.path.isdir(full_path):
                if os.path.exists(os.path.join(DIRECTORY, 'index.html')):
                    self.path = '/index.html'
                elif os.path.exists(os.path.join(DIRECTORY, 'app.html')):
                    self.path = '/app.html'

            return super().do_GET()
        except Exception:
            # Fallback to prevent 500 error
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=UTF-8')
            self.end_headers()
            self.wfile.write(b"<!DOCTYPE html><html><body><h3>Shiftly Local Server</h3><p>Please refresh in a moment.</p></body></html>")

def open_browser(port):
    time.sleep(0.8)
    webbrowser.open(f'http://localhost:{port}')

if __name__ == '__main__':
    server_created = False
    httpd = None
    for p in [PORT, 3001, 8080, 8000, 5000]:
        try:
            httpd = HTTPServer(('0.0.0.0', p), SPAServerHandler)
            PORT = p
            server_created = True
            break
        except OSError:
            continue

    if not server_created:
        print("Error: Could not bind to any local port.")
        sys.exit(1)

    print("=" * 60)
    print("      SHIFTLY WORKFORCE PLATFORM - LOCAL SERVER")
    print("=" * 60)
    print(f"Server successfully running at: http://localhost:{PORT}")
    print("Opening your default web browser...")
    print("Keep this terminal open while using Shiftly.")
    print("Press Ctrl+C to stop.\n")

    threading.Thread(target=open_browser, args=(PORT,), daemon=True).start()

    with httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()
