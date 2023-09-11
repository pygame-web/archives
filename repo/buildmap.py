#!/bin/env python3
import json
from pathlib import Path
from zipfile import ZipFile


MAP = {"-CDN-": "https://pygame-web.github.io/archives/repo/"}


# https://pypi.org/simple/pygbag/?format=application/vnd.pypi.simple.latest+json

# top_level.txt fallback from pyodide ( for ref)
# https://github.com/pyodide/pyodide/blob/90e20badd76d8a8b911f77034512137cc2e7d585/pyodide-build/pyodide_build/common.py#L123-L133
# https://github.com/pypa/setuptools/blob/d680efc8b4cd9aa388d07d3e298b870d26e9e04b/setuptools/discovery.py#L122

# top_level falback from pradyunsg ( used there )
# https://gist.github.com/pradyunsg/22ca089b48ca55d75ca843a5946b2691

from collections import deque
from typing import Iterable
from installer.sources import WheelFile, WheelSource
from installer.utils import parse_metadata_file


def _find_importable_components_from_wheel_content_listing(
    filepaths: Iterable[str], *, dist_info_dir: str, data_dir: str
) -> Iterable[tuple[str, ...]]:
    purelib_str = f"{data_dir}/purelib/"
    platlib_str = f"{data_dir}/platlib/"
    for path in filepaths:
        if path.startswith(dist_info_dir):
            # Nothing in dist-info is importable.
            continue

        if path.startswith((platlib_str, purelib_str)):
            # Remove the prefix from purelib and platlib files.
            name = path[len(platlib_str) :]
        elif path.startswith(data_dir):
            # Nothing else in data is importable.
            continue
        else:
            # Top level files end up in an importable location.
            name = path

        if name.endswith(".py"):
            yield tuple(name[: -len(".py")].split("/"))


def find_major_import_import_names(wheel: WheelSource) -> Iterable[str]:
    metadata = parse_metadata_file(wheel.read_dist_info("WHEEL"))
    if not (metadata["Wheel-Version"] and metadata["Wheel-Version"].startswith("1.")):
        raise NotImplementedError("Only supports wheel 1.x")

    filepaths: Iterable[str] = (
        record_elements[0] for record_elements, _, _ in wheel.get_contents()
    )
    importable_components = _find_importable_components_from_wheel_content_listing(
        filepaths, dist_info_dir=wheel.dist_info_dir, data_dir=wheel.data_dir
    )

    return _determine_major_import_names(importable_components)


def _determine_major_import_names(
    importable_components: Iterable[tuple[str, ...]]
) -> Iterable[str]:
    # If you literally want the "top level", just do...
    # return {components[0] for components in importable_components}

    # Here, we're going to try to find the longest initial import name instead.
    # Mostly, because this was a fun problem to thing through.

    # Build a tree out of the components
    tree = {}
    for components in importable_components:
        subtree = tree
        for segment in components:
            if segment not in subtree:
                subtree[segment] = {}
            subtree = subtree[segment]

    # Recurse through the tree to find the names which have != 1 children.
    queue = deque()
    queue.appendleft((tree, ()))
    while queue:
        current_tree, current_name = queue.popleft()

        for name, subtree in current_tree.items():
            subname = (*current_name, name)
            if len(subtree) == 1:
                queue.append((subtree, subname))
            elif name == "__init__":
                yield ".".join(current_name)
            else:
                yield ".".join(subname)


for whl in Path(".").glob("pkg/*.whl"):
    whlname = whl.as_posix()

    for replace in ("-cp310", "-cp311", "-cp312", "-cp313"):
        whlname = whlname.replace(replace, "-<abi>")

    found = False

    with ZipFile(whl) as archive:
        for name in archive.namelist():
            if name.endswith(".dist-info/top_level.txt"):
                f = archive.open(name)
                for tln in f.read().decode().split("\n"):
                    tln = tln.strip().replace("/", ".")
                    if not tln:
                        continue



                    if tln in MAP:
                        # print(f"pkg name toplevel {tln} collision with", MAP[tln] )
                        continue
                    # print("\t",tln)
                    MAP[tln] = whlname
#=============================================================================
                    if tln == "cwcwidth":
                        MAP["wcwidth"] = whlname
#=============================================================================
                archive.close()
                found = True
                break
        if not found:
            print()
            print("MISSING TOPLEVEL :", whl)
            wheel_file = WheelFile(archive)
            for tln in find_major_import_import_names(wheel_file):
                MAP[tln] = whlname


print("""



        ============== bi ======================



""")

for whl in Path(".").glob("pkg/*wasm32_bi_emscripten.whl"):
    whlname = whl.as_posix()

    for replace in ("-cp310", "-cp311", "-cp312", "-cp313"):
        whlname = whlname.replace(replace, "-<abi>")

    whlname = whlname.replace("-wasm32_bi_emscripten", "-<api>")


    found = False

    with ZipFile(whl) as archive:
        for name in archive.namelist():
            if name.endswith(".dist-info/top_level.txt"):
                f = archive.open(name)
                for tln in f.read().decode().split("\n"):
                    tln = tln.strip().replace("/", ".")
                    if not tln:
                        continue

                    if tln in MAP:
                        print(f"override pkg name toplevel {tln} with", whlname )
                    MAP[tln] = whlname
                archive.close()
                found = True
                break
        if not found:
            print()
            print("MISSING TOPLEVEL :", whl)
            wheel_file = WheelFile(archive)
            for tln in find_major_import_import_names(wheel_file):
                MAP[tln] = whlname

input()

for py in Path(".").glob("vendor/*.py"):
    tln = py.stem
    MAP[tln] = py.as_posix()

for k, v in MAP.items():
    print(k, v)

with open("index-bi.json", "w") as f:
    print(json.dumps(MAP, sort_keys=True, indent=4), file=f)
