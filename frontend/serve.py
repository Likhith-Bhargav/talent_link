import http.server
import socketserver
import os
import webbrowser
import socket
import urllib.parse
import urllib.request
import json
import os
import mimetypes
from http import HTTPStatus
from pathlib import Path

# Configuration
PORT = 3000
BACKEND_URL = 'http://localhost:8000'
FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)
    
    def do_OPTIONS(self):
        """Handle preflight CORS requests."""
        self.send_response(200, "ok")
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        """Add CORS headers to the response."""
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:3000')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, X-CSRFToken')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Expose-Headers', 'Content-Type, X-CSRFToken')

    def _set_headers(self, status_code=200, content_type='text/html'):
        """Set common headers for the response."""
        self.send_response(status_code)
        if content_type:
            self.send_header('Content-Type', content_type)
        self.send_cors_headers()
        self.end_headers()

    def handle_http_method(self):
        """Handle all HTTP methods by routing to the appropriate handler."""
        if self.path.startswith('/api/'):
            self.proxy_request()
        else:
            self.serve_static_file()

    def do_GET(self):
        self.handle_http_method()

    def do_POST(self):
        self.handle_http_method()

    def do_PUT(self):
        self.handle_http_method()
        
    def do_PATCH(self):
        self.handle_http_method()

    def do_DELETE(self):
        self.handle_http_method()

    def serve_static_file(self):
        """Serve static files from the frontend directory."""
        # Handle root path
        if self.path == '/':
            self.path = '/index.html'
        
        # Remove query string for file path resolution
        path = self.path.split('?')[0]
        
        # Handle SPA routing - serve index.html for any non-API route that doesn't exist
        file_path = os.path.join(FRONTEND_DIR, path.lstrip('/'))
        
        # If the path doesn't exist or is a directory, serve index.html
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            file_path = os.path.join(FRONTEND_DIR, 'index.html')
            
            try:
                with open(file_path, 'rb') as f:
                    self._set_headers(200, 'text/html')
                    self.wfile.write(f.read())
                return
            except Exception as e:
                self._set_headers(500, 'text/plain')
                self.wfile.write(f'Error serving index.html: {str(e)}'.encode())
                return
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        
        try:
            with open(file_path, 'rb') as f:
                self._set_headers(200, mime_type)
                self.wfile.write(f.read())
        except Exception as e:
            self._set_headers(500, 'text/plain')
            self.wfile.write(f'Error serving file: {str(e)}'.encode())

    def proxy_request(self):
        """Proxy API requests to the backend server."""
        # Read request body if present
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        
        # Build the backend URL
        url = f"{BACKEND_URL}{self.path}"
        
        # Create request to backend
        req = urllib.request.Request(url, data=body, method=self.command)
        
        # Forward headers
        for header, value in self.headers.items():
            header_lower = header.lower()
            # Skip certain headers that should be set by urllib
            if header_lower not in ('host', 'content-length', 'connection'):
                req.add_header(header, value)
        
        try:
            with urllib.request.urlopen(req) as response:
                # Forward response status and headers
                self.send_response(response.status)
                
                # Forward response headers
                for header, value in response.getheaders():
                    # Skip certain headers that should be set by the server
                    if header.lower() not in ('transfer-encoding', 'connection'):
                        self.send_header(header, value)
                
                self.send_cors_headers()
                self.end_headers()
                
                # Forward response body in chunks
                while True:
                    chunk = response.read(16 * 1024)  # 16KB chunks
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                
        except urllib.error.HTTPError as e:
            # Handle HTTP errors from the backend
            self.send_response(e.code)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            error_data = {
                'status': e.code,
                'detail': str(e.reason),
                'path': self.path
            }
            self.wfile.write(json.dumps(error_data).encode())
            
        except Exception as e:
            # Handle other errors
            self.send_response(500)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            error_data = {
                'status': 500,
                'detail': f'Internal server error: {str(e)}',
                'path': self.path
            }
            self.wfile.write(json.dumps(error_data).encode())

if __name__ == '__main__':
    # Add MIME type for JavaScript modules
    mimetypes.add_type('text/javascript', '.js')
    mimetypes.add_type('text/css', '.css')
    
    # Create the server
    Handler = CORSRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving frontend at http://localhost:{PORT}")
        print(f"Proxying API requests to {BACKEND_URL}")
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down the server...")
            httpd.server_close()
            print("Server stopped.")
