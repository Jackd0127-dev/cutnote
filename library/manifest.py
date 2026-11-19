#!/usr/bin/env python3
"""List the library's components: every components/<id>/component.js is one component (drop a folder in, it's in).

    python3 manifest.py            -> writes manifest.json beside this file (the gallery page reads it)
    python3 manifest.py --print    -> prints it instead

review.py scans the folder itself on every request, so the player never needs this step; the static gallery does."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def scan(root=HERE):
    comp = os.path.join(root, "components")
    out = []
    for name in sorted(os.listdir(comp)) if os.path.isdir(comp) else []:
        f = os.path.join(comp, name, "component.js")
        if os.path.isfile(f):
            out.append({"id": name, "script": f"components/{name}/component.js", "mtime": int(os.path.getmtime(f))})
    return out


if __name__ == "__main__":
    m = {"components": scan()}
    if "--print" in sys.argv:
        print(json.dumps(m, indent=2))
    else:
        with open(os.path.join(HERE, "manifest.json"), "w") as fh:
            json.dump(m, fh, indent=2)
        print(f"{len(m['components'])} components -> manifest.json")
