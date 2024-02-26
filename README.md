# archives
archived prebuilts used by pygbag runtime.

Content per version folder : 
- Xterm.js 5.1+ sixel addon
- libpython wasm from current CPython release 3.11.x/3.12.x series and 3.13(git)
- pymain with Panda3D modules facilitating access to emscripten ecosystem.
- a minimal emscripten MEMFS filesystem that contains minimal stdlib
- BrowserFS a library to extend above filesystem to support zip archives and read/write overlays.
- a "site" pythonrc.py that patch some modules for the wasm platform and take care of running main() in a async way
- some js glue (pythons.js) to load everything above 


