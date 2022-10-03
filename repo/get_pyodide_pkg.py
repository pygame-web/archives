#!/bin/env python3

import json
import os

from pathlib import Path
from zipfile import ZipFile


"""

embed.preload("/usr/lib/python3.10/site-packages/numpy/core/_multiarray_umath.cpython-310-wasm32-emscripten.so")

https://pypi.org/pypi/pygbag/0.1.3/json

"""

base="https://cdn.jsdelivr.net/pyodide/dev/full/"

if 0:
    os.system(f"mv  repodata.json repodata.old;wget {base}repodata.json")

    pyo = json.loads(open("repodata.json").read())
    for k in pyo["packages"].keys():
        print(k)
        for fld in pyo["packages"][k].keys():
             print ("\t", [fld] )


        for fld in ('name','file_name','sha256'):
            print ("\t", pyo["packages"][k][fld] )
            os.system(f'''wget -c {base}{pyo["packages"][k]["file_name"]}''')



for whl in Path(".").glob("*.whl"):
    print()

    norm = whl.stem.replace("emscripten_3_1_21_wasm32", "wasm32_mvp_emscripten")
    print(whl.stem,"->",norm)
    os.system(f"""

mkdir {norm}

if cd {norm}
then
    unzip ../{whl}
    ../../norm.sh
    cd ..
    rm -rf {norm}
fi

""")

