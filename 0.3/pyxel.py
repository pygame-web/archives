# gui  https://kitao.github.io/pyxel/wasm/pyxel-1.8.3-cp37-abi3-emscripten_3_1_20_wasm32.whl

import sys
import asyncio
import platform
import json
from pathlib import Path

# screen pixels (real, hardware)
WIDTH=1024  # {{cookiecutter.width}}
HEIGHT=600  # {{cookiecutter.height}}

# reference/idealized screen pixels
REFX = 1980
REFY = 1080

def u(real, ref, v):
    if abs(v)<0.9999999:
        result = int( (float(real)/100.0) * (v*1000))
        if v<0:
            return real-result
        return result
    return int( (real/ref) * v )

def ux(*argv):
    global WIDTH, REFX
    acc = 0
    for v in argv:
        acc += u(WIDTH, REFX, v)
    return acc

def uy(*argv):
    global HEIGHT, REFY
    acc = 0
    for v in argv:
        acc += u(HEIGHT, REFY, v)
    return acc

print("""
Loading {{cookiecutter.title}} from {{cookiecutter.archive}}.apk
    Pygbag Version : {{cookiecutter.version}}
    Template Version : 0.3.0
    CDN URL : {{cookiecutter.cdn}}
    Screen  : {{cookiecutter.width}}x{{cookiecutter.height}}
    Title   : {{cookiecutter.title}}
    Folder  : {{cookiecutter.directory}}
    Authors : {{cookiecutter.authors}}
    SPDX-License-Identifier: {{cookiecutter.spdx}}

""")

# don't rename
async def sitecustomize():
    import embed

    platform.document.body.style.background = "#7f7f7f"

    import pygame

    def compose():
        pygame.display.update()
        window.chromakey(None, *screen.get_colorkey(), 40)

    pygame.init()
    pygame.font.init()

    screen = pygame.display.set_mode([ux(.100),uy(.100)], pygame.SRCALPHA, 32)
    screen.set_colorkey( (0,0,0,0), pygame.RLEACCEL )
    screen.fill( (0,0,0,0) )

    compose()

    platform.window.transfer.hidden = true
    platform.window.canvas.style.visibility = "visible"



    apk = "{{cookiecutter.archive}}.apk"

    bundle = "{{cookiecutter.archive}}"

    # the C or js loader could do that but be explicit.
    appdir = Path(f"/data/data/{bundle}") # /data/data/{{cookiecutter.archive}}
    appdir.mkdir()


    # mount apk

    cfg = {
        "io": "url",
        "type":"mount",
        "mount" : {
            "point" : appdir.as_posix(),
            "path" : "/",
        }

    }

    track = platform.window.MM.prepare(apk, json.dumps(cfg))

    marginx = ux(.020) # 20%
    marginy = uy(.045) # 45%


    def pg_bar(pos):
        nonlocal marginx, marginy
        # resolution of progress bar, recalculate since it may not be know yet.
        total = track.len or 10  # avoid div0
        slot = ux(.060)/ total # 60%

        pygame.draw.rect(screen,(10,10,10),( marginx-ux(10), marginy-uy(10), (total*slot)+ux(20), uy(110) ) )
        pygame.draw.rect(screen,(0,255,0), ( marginx, marginy, track.pos*slot, uy(90)) )

    # wait until zip mount + overlayfs is complete
    while not track.ready:
        pg_bar(track.pos)
        compose()
        await asyncio.sleep(.1)

    # fill it up in case it was cached and instant download
    pg_bar(track.len)
    compose()


    # preloader will change dir and prepend it to sys.path
    platform.run_main(PyConfig, loaderhome= appdir / "assets", loadermain=None)


    # wait preloading complete
    # that includes images and wasm compilation of bundled modules
    while embed.counter()<0:
        await asyncio.sleep(.1)

    main = appdir / "assets" / "main.py"

    # test/wait user media interaction
    if not platform.window.MM.UME:

        # now that apk is mounted we have access to font cache
        # but we need to fill __file__ that is not yet set
        __import__(__name__).__file__ = main

        # now make a prompt
        fnt = pygame.sysfont.SysFont("freesans",  uy(80) )
        prompt = fnt.render("Ready to start !", True, "blue")
        pg_bar(track.len)
        screen.blit(prompt, ( marginx+ ux(80), marginy - uy(10) ) )
        compose()
        print("""
        * Waiting for media user engagement : please click/touch page *
    """)
        while not platform.window.MM.UME:
            await asyncio.sleep(.1)


    print("145: running main and resuming EventTarget in a few seconds")
    execfile(main)

    # if you don't reach that step
    # your main.py has an infinite sync loop somewhere !
    print("150: ready")


    # makes all queued events arrive after program has looped a few cycles
    while not aio.run_called:
        await asyncio.sleep(.1)

    aio.create_task(platform.EventTarget.process())



asyncio.run( sitecustomize() )

