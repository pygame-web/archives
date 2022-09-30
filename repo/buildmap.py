#!/bin/env python3
import json
from pathlib import Path
from zipfile import ZipFile

MAP = { "-CDN-" : "https://pygame-web.github.io/archives/repo/" }

# date +"%Y.%m"

# https://pypi.org/simple/pygbag/?format=application/vnd.pypi.simple.latest+json

for whl in Path(".").glob("pkg/*.whl"):
    print()
    print(whl.stem)
    with ZipFile(whl) as zf:
        for name in zf.namelist():
            if name.endswith('.dist-info/top_level.txt'):
                #print("\t",name)
                f = zf.open(name)
                for tln in f.read().decode().split('\n'):
                    tln = tln.strip()
                    if not tln:
                        continue

                    whlname = whl.as_posix()

                    for replace in ('-cp310','-cp311','-cp312'):
                        whlname  = whlname.replace(replace,'-<abi>')

                    if tln in MAP:
                        #print(f"pkg name toplevel {tln} collision with", MAP[tln] )
                        continue
                    print("\t",tln)
                    MAP[tln] = whlname
                zf.close()
                break

for py in Path(".").glob("vendor/*.py"):
    tln = py.stem
    MAP[tln] = py.as_posix()

for k,v in MAP.items():
    print(k,v)

with open("index.json","w") as f:
    print( json.dumps(MAP, sort_keys=True, indent=4), file=f)


