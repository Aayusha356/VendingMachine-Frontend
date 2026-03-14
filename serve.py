"""Start the frontend dev server and print a clickable URL."""
import http.server
import socketserver

PORT = 5502

print()
print(f"  Frontend running at:  http://localhost:{PORT}/")
print("  (Ctrl+click to open)")
print()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")