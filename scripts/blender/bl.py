# Run Python inside the open Blender via the Blender Lab MCP add-on socket (localhost:9876).
# Usage: python3 bl.py file.py   (the script sets `result = {...}`)
#        python3 bl.py -c "result = {'n': len(bpy.data.objects)}"
#        python3 bl.py --bpy file.py   (no Blender open: in this process, with the `bpy` module, pip install bpy)
import json, os, socket, sys

def run(code, timeout=1800):
    s = socket.create_connection(("127.0.0.1", 9876), timeout=timeout)
    s.sendall((json.dumps({"type": "execute", "code": code, "strict_json": False}) + "\0").encode())
    buf = b""
    while b"\0" not in buf:
        c = s.recv(1 << 20)
        if not c:
            break
        buf += c
    s.close()
    return json.loads(buf.split(b"\0")[0].decode())

if __name__ == "__main__":
    repo = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if sys.argv[1] == "--bpy":
        import bpy
        g = {"bpy": bpy, "SERPENTINE": repo, "__name__": "__main__"}
        exec(open(sys.argv[2]).read(), g)
        print(json.dumps(g.get("result"), indent=1, default=str)[:8000])
        sys.exit(0)
    code = sys.argv[2] if sys.argv[1] == "-c" else open(sys.argv[1]).read()
    code = f"import bpy\nSERPENTINE = {repo!r}\n" + code
    r = run(code)
    out = json.dumps(r, indent=1)
    print(out[:8000])
    sys.exit(0 if r.get("status") == "ok" else 1)
