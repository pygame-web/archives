"use strict";


const logLines = ["Property (Typeof): Value", `location (${typeof location}): ${location}`];
for (const prop in location) {
    logLines.push(`${prop} (${typeof location[prop]}): ${location[prop] || "n/a"}`);
}
console.log( logLines.join("\n") )



if (window.config) {
   var config = window.config
} else {
   var config = {}
}





String.prototype.rsplit = function(sep, maxsplit) {
    var split = this.split(sep);
    return maxsplit ? [ split.slice(0, -maxsplit).join(sep) ].concat(split.slice(-maxsplit)) : split;
}

window.__defineGetter__('__FILE__', function() {
  return (new Error).stack.split('/').slice(-1).join().split('?')[0].split(':')[0] +": "
})


const delay = (ms, fn_solver) => new Promise(resolve => setTimeout(() => resolve(fn_solver()), ms));

function _until(fn_solver){
    return async function fwrapper(){
        var argv = Array.from(arguments)
        function solve_me(){return  fn_solver.apply(window, argv ) }
        while (!await delay(16, solve_me ) )
            {};
    }
}

function defined(e, o){
    if (typeof o === 'undefined' || o === null)
        o = window;
    try {
        e = o[e];
    } catch (x) { return false }

    if (typeof e === 'undefined' || e === null)
        return false;
    return true;
}


// promise to iterator converter
var prom = {}
var prom_count = 0
window.iterator = function * iterator(oprom) {
    const mark = prom_count++;
    var counter = 0;
    oprom.then( (value) => prom[mark] = value )
    while (!prom[mark]) {
        yield counter++;
    }
    yield prom[mark];
    delete prom[mark]
}

//imgretrieve
window.cross_img = function * cross_img(url, store) {
    var done = 0
    const cors_img = new Image();
        cors_img.crossOrigin = "Anonymous";
        cors_img.src = url;
        cors_img.addEventListener("load", function(){ done = 1 }, false);
    while (!done)
        yield done
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");
    canvas.width = cors_img.width;
    canvas.height = cors_img.height;
    context.drawImage(cors_img, 0, 0);
    yield canvas.toDataURL("image/png")
}

function checkStatus(response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
  }
  return response;
}



//fileretrieve (binary). TODO: wasm compilation
window.cross_file = function * cross_file(url, store) {
    var content = 0
    console.log("cross_file.fetch", url )
    fetch(url,{})
        .then( response => checkStatus(response) && response.arrayBuffer() )
        .then( buffer => content = new Uint8Array(buffer) )
        .catch(x => console.error(x))


    while (!content)
        yield content
    FS.writeFile(store, content )
    console.log("cross_file.fetch",store,"r/w=", content.byteLength )
    yield store
}


//urlretrieve
function DEPRECATED_wget_sync(url, store){
    const request = new XMLHttpRequest();
    try {
        request.open('GET', url, false);
        request.send(null);
        if (request.status === 200) {
            console.log(`DEPRECATED_wget_sync(${url})`);
            FS.writeFile( store, request.responseText);
        }
        return request.status
    } catch (ex) {
        return 500;
    }
}


function prerun(VM) {

    console.warn("VM.prerun")

    if (window.BrowserFS) {
        vm.BFS = new BrowserFS.EmscriptenFS()
        VM.BFS.Buffer = BrowserFS.BFSRequire('buffer').Buffer
    }

    const sixel_prefix = String.fromCharCode(27)+"Pq"

    const statusElement = document.getElementById('status') || {};
    const progressElement = document.getElementById('progress') || {};
    const spinnerElement = document.getElementById('spinner') || { style: {} } ;

    var buffer_stdout = ""
    var buffer_stderr = ""
    var flushed_stdout = false
    var flushed_stderr = false


    const text_codec = new TextDecoder()


    function b_utf8(s) {
        var ary = []
        for ( var i=0; i<s.length; i+=1 ) {
            ary.push( s.substr(i,1).charCodeAt(0) )
        }
        return text_codec.decode(  new Uint8Array(ary) )
    }


    function stdin() {
        return null
    }



    function stdout(code) {

        var flush = (code == 4)

        if (flush) {
            flushed_stdout = true
        } else {
            if (code == 10) {
                if (flushed_stdout) {
                    flushed_stdout = false
                    return
                }

                buffer_stdout += "\r\n";
                flush = true
            }
            flushed_stdout = false
        }

        if (buffer_stdout != "") {
            if (flush) {
                if (buffer_stdout.startsWith(sixel_prefix)) {
                    console.info("[sixel image]");
                    VM.vt.sixel(buffer_stdout);
                } else {
                    if (buffer_stdout.startsWith("Looks like you are rendering"))
                        return;

                    VM.vt.xterm.write( b_utf8(buffer_stdout) )
                }
                buffer_stdout = ""
                return
            }
        }
        if (!flush)
            buffer_stdout += String.fromCharCode(code);
    }


    function stderr(code) {
        var flush = (code == 4)

        if (flush) {
            flushed_stderr = true
        } else {
            if (code === 10) {
                if (flushed_stderr) {
                    flushed_stderr = false
                    return
                }
                buffer_stderr += "\r\n";
                flush = true
            }
            flushed_stderr = false
        }

        if (buffer_stderr != "") {
            if (flush) {
                if (!VM.vt.nodup)
                    console.log(buffer_stderr);

                VM.vt.xterm.write( b_utf8(buffer_stderr) )
                buffer_stderr = ""
                return
            }
        }
        if (!flush)
            buffer_stderr += String.fromCharCode(code);
    }

    // put script namespace in sys.argv[0]
    // default is org.python
    VM.arguments.push(VM.APK)

    VM.FS.init(stdin, stdout, stderr);
}


async function _rcp(url, store) {
    var content
    try {
        content = await fetch(url)
    } catch (x) { return false }

    store = store || ( "/data/data/" + url )
    console.info(__FILE__,`rcp ${url} => ${store}`)
    if (content.ok) {
        const text= await content.text()
        await vm.FS.writeFile( store, text);
        return true;
    } else {
        console.error(__FILE__,`can't rcp ${url} to ${store}`)
        return false;
    }
}

const vm = {
        APK : "org.python",

        arguments: [],

        argv : [],

        script : {},

        DEPRECATED_wget_sync : DEPRECATED_wget_sync,

        vt : {
                xterm : { write : console.log},
                sixel : function(data){ vm.vt.xterm.write(`[sixel:${data && data.length}]\r\n`)},
                nodup : 1
        },

//        canvas: (() => document.getElementById('canvas'))(),

        locateFile : function(path, prefix) {
            if (path == "main.data") {
                const url = (config.cdn || "" )+`python${config.pydigits}/${path}`
                console.log(__FILE__,"locateData: "+path+' '+prefix, "->", url);
                return url;
            } else {
                console.log(__FILE__,"locateFile: "+path+' '+prefix);
            }
            return prefix + path;
        },

        PyRun_SimpleString : function(code) {
            if (window.worker) {
                window.worker.postMessage({ target: 'custom', userData: code });
            } else {
                this.postMessage(code);
            }
        },

        preRun : [ prerun ],
        postRun : [ function (VM) {
            window.python = VM
            setTimeout(custom_postrun, 10)
        } ]
}


async function custom_postrun() {
    console.warn("VM.postrun")
    if (await _rcp(vm.config.cdn + "pythonrc.py","/data/data/pythonrc.py")) {
        python.PyConfig.executable = "windows.url"
        var runsite = `#!
import os,sys,json

PyConfig = json.loads("""${JSON.stringify(python.PyConfig)}""")

if os.path.isdir(PyConfig['prefix']):
    sys.path.append(PyConfig['prefix'])
    os.chdir(PyConfig['prefix'])

if os.path.isfile("/data/data/pythonrc.py"):
    exec(open("/data/data/pythonrc.py").read(), globals(), globals())
# <- keep it here
`

        vm.FS.writeFile( "/data/data/org.python/assets/main.py" , vm.script.main[0] )

        python.PyRun_SimpleString(runsite)

    }


}


for (const script of document.getElementsByTagName('script')) {
    const main = "runpy.js"
    if (script.type == 'module') {

        if (  script.src.search(main) >=0 ) {
            var url = script.src

            if (url.endsWith(main)){
                url = url+"?#"
            }

            var elems = url.rsplit('#',1)

                url = elems.shift()

            var code = elems.shift() || script.text


            elems = url.rsplit('?',1)
            url = elems.shift()

            if ( script.src.substr( url.length ).length < 3 ) {
                url = location.origin + location.pathname
                elems = location.search.substr(1).split('&') // python argv
                vm.script.interpreter = "cpython"+elems.shift()
                window.document.title =  vm.script.interpreter + location.hash
                Array.prototype.push.apply(vm.argv, elems )
            } else {
                elems = elems.shift().split('&')
                vm.script.interpreter = elems.shift()
                Array.prototype.push.apply(vm.argv, elems )
            }

            // running pygbag proxy or lan testing ?
            if (location.hostname === "localhost") {
                //config.cdn = location.origin + "/"
                config.cdn = script.src.split("?",1)[0].replace(main,"")
            }

            if (vm.script.interpreter.startsWith("cpython")){

                config.cdn     ??= script.src.split(main,1)[0],
                config.xtermjs ??= 0
                config.interactive ??= 0
                //config.archive  ??= 0
config.archive = 0

                config.debug ??= (location.hash.search("#debug")>=0)
                config.gui_debug ??= 2

                config.autorun  ??= 0
                config.features ??= script.dataset.src.split(","),
                config.PYBUILD  ??= vm.script.interpreter.substr(7) || "3.11",
                config._sdl2    ??= "canvas"

                config.pydigits ??= config.PYBUILD.replace(".","")
                config.executable ??= `${config.cdn}python${config.pydigits}/main.js`
            }


            vm.PyConfig = JSON.parse(`
                {
                    "base_executable" : null,
                    "base_prefix" : null,
                    "buffered_stdio" : null,
                    "bytes_warning" : 0,
                    "warn_default_encoding" : 0,
                    "code_debug_ranges" : 1,
                    "check_hash_pycs_mode" : "default",
                    "configure_c_stdio" : 1,
                    "dev_mode" : -1,
                    "dump_refs" : 0,
                    "exec_prefix" : null,
                    "executable" : "${config.executable}",
                    "faulthandler" : 0,
                    "filesystem_encoding" : "utf-8",
                    "filesystem_errors" : "surrogatepass",
                    "use_hash_seed" : 1,
                    "hash_seed" : 1,
                    "home": null,
                    "import_time" : 0,
                    "inspect" : 1,
                    "install_signal_handlers" :0 ,
                    "interactive" : ${config.interactive},
                    "isolated" : 1,
                    "legacy_windows_stdio":0,
                    "malloc_stats" : 0 ,
                    "platlibdir" : "lib",
                    "prefix" : "/data/data/org.python/assets/site-packages",
                    "ps1" : ">>> ",
                    "ps2" : "... "
                }`)

            for (const prop in config)
                console.log(`config.${prop} =`, config[prop] )

            console.log('interpreter=', vm.script.interpreter)
            console.log('url=', url)
            console.log('src=', script.src)
            console.log('data-src=', script.dataset.src)
            console.log('script: id=', script.id)
            console.log('code : ' , code.length)

            vm.config = config

// TODO remote script
            vm.script.main = [ code ]

// TODO scripts argv ( sys.argv )

            // only one script tag for now
            break
        }
    } else {
        console.log("script?", script.type, script.id, script.src, script.text )
    }
}

for (const script of document.getElementsByTagName('script')) {
    // process py-script brython whatever and push to vm.script.main
    // for concat with vm.FS.writeFile
}





// CANVAS

// TODO : variable SIZE ratio vs PARENT
//  default is 1/2

function feat_gui(debug_hidden) {

    var canvas = document.getElementById("canvas")

    if (!canvas) {
        canvas = document.createElement("canvas")
        canvas.id = "canvas"
        canvas.style.position = "absolute"
        canvas.style.top = "10px"
        canvas.style.right = "10px"
        document.body.appendChild(canvas)
        //br()
    }

/*
    //var canvas = document.getElementById('canvas');

    var gl_aa = true
    var gl = null

    // 3D canvas
    try {
        //gl = canvas.getContext("webgl2", {antialias:gl_aa}) || canvas.getContext("webgl", {antialias:gl_aa});
        gl = canvas.getContext("webgl2", {antialias:gl_aa});
    } catch (x) {
        console.log("WebGL : error "+x)
        gl = null;
    }

    if (!gl) {
        var msg = "WebGL : your browser doesn't support WebGL. This application won't work.\r\n";
        console.log(msg);
        vm.vt.xterm.write(msg);
        return;

    }

    var ext = gl.getExtension('OES_standard_derivatives');
    if (!ext)
        console.log('WebGL : [OES_standard_derivatives] supported');
    else
        console.log('WebGL : Error [OES_standard_derivatives] derivatives *not* supported');


    var antialias = gl.getContextAttributes().antialias;
    console.log('WebGL : antialias = '+antialias);

    var aasize = gl.getParameter(gl.SAMPLES);
    console.log('WebGL : antialias size = '+aasize );
*/
    vm.canvas = canvas


    // window resize
    function window_canvas_adjust(divider) {
        var want_w
        var want_h

        const ar = canvas.width / canvas.height

        // default is maximize
        var max_width = window.innerWidth
        var max_height = window.innerHeight


        if (vm.config.debug) {
            max_width = max_width * .80
            max_height = max_height * .80
        }

        want_w = max_width
        want_h = max_height

        console.log("window:", want_w, want_h )
        if (window.devicePixelRatio != 1 )
            console.warn("Unsupported device pixel ratio", window.devicePixelRatio)


        // TODO: check height bounding box
        if (vm.config.debug) {
            divider = vm.config.gui_debug
        } else {
            divider ??= vm.config.gui_divider || 1
        }

        console.log("window[DEBUG]:", want_w, want_h, ar, divider)
        want_w = Math.trunc(want_w / divider )
        want_h = Math.trunc(want_w / ar)
        console.log("window[DEBUG]:", want_w, want_h, ar)


        // constraints
        if (want_h > max_height) {
            want_h = max_height
            want_w = want_h * ar
        }
        if (want_w > max_width) {
                want_w = max_width
                want_h = want_h / ar
        }

        // apply

        canvas.style.width = want_w + "px"
        canvas.style.height = want_h + "px"
        //console.log("style[NEW]:", canvas.style.width, canvas.style.height)
    }

    function window_resize(gui_divider) {
        if (!window.canvas) {
            console.warn("416: No canvas defined")
            return
        }
        setTimeout(window_canvas_adjust, 100, gui_divider);
        setTimeout(window.focus, 200);
    }

    function window_resize_event() {
        window_resize(vm.config.gui_divider)
    }

    window.addEventListener('resize', window_resize_event);
    window.window_resize = window_resize

}

function queue_event(evname, data) {
    const jsdata = JSON.stringify(data)
    EQ.push( { name : evname, data : jsdata} )

    if (window.python) {
        while (EQ.length>0) {
            const ev = EQ.shift()
            python.PyRun_SimpleString(`#!
__EMSCRIPTEN__.EventTarget.build('${ev.name}', """${ev.data}""")
`)
        }
    } else {
        console.warn(`Event "${evname}" queued : too early`)
    }
}


// file transfer (upload)

function feat_fs(debug_hidden) {
    var uploaded_file_count = 0

    function readFileAsArrayBuffer(file, success, error) {
        var fr = new FileReader();
        fr.addEventListener('error', error, false);
        if (fr.readAsBinaryString) {
            fr.addEventListener('load', function () {
                var string = this.resultString != null ? this.resultString : this.result;
                var result = new Uint8Array(string.length);
                for (var i = 0; i < string.length; i++) {
                    result[i] = string.charCodeAt(i);
                }
                success(result.buffer);
            }, false);
            return fr.readAsBinaryString(file);
        } else {
            fr.addEventListener('load', function () {
                success(this.result);
            }, false);
            return fr.readAsArrayBuffer(file);
        }
    }

    async function transfer_uploads(){
        //let reader = new FileReader();

        for (var i=0;i<dlg_multifile.files.length;i++) {
            let file = dlg_multifile.files[i]
            var frec = {}
            const datapath = `/tmp/upload-${uploaded_file_count}`
                frec["name"] = file.name
            frec["size"] = file.size
            frec["mimetype"] = file.type
            frec["text"] = datapath

            function file_done(data) {
                const pydata = JSON.stringify(frec)
                console.warn("UPLOAD", pydata );
                python.FS.writeFile(datapath, new Int8Array(data) )
                queue_event("upload", pydata )
            }
            readFileAsArrayBuffer(file, file_done, console.error )
            uploaded_file_count++;
        }

    }
    var dlg_multifile = document.getElementById("dlg_multifile")
    if (!dlg_multifile) {
        dlg_multifile = document.createElement('input')
        dlg_multifile.setAttribute("type","file")
        dlg_multifile.setAttribute("id","dlg_multifile")
        dlg_multifile.setAttribute("multiple",true)
        dlg_multifile.hidden = debug_hidden
        document.body.appendChild(dlg_multifile)
        //br()
    }
    dlg_multifile.addEventListener("change", transfer_uploads );

}

// simpleterm
async function feat_vt(debug_hidden) {
    var stdio = document.getElementById('stdio')
    if (!stdio){
        stdio = document.createElement('div')
        stdio.id = "stdio"
        stdio.style.width = "640px";
        stdio.style.height = "480px";
        stdio.style.background = "black";
        stdio.style.color = "yellow";
        stdio.innerHTML = "vt100"
        stdio.hidden = debug_hidden
        stdio.setAttribute("tabIndex", 1)
        document.body.appendChild(stdio)
        //br()
    }

    const { Terminal, helper, handlevt } = await import("./vt.js")

    vm.vt.xterm = new Terminal("stdio", 132,25)
    vm.vt.xterm.set_vm_handler(vm, null, null)

    vm.vt.xterm.open()

}

// xterm.js + sixel
async function feat_vtx(debug_hidden) {
    var terminal = document.getElementById('terminal')
    if (!terminal){
        terminal = document.createElement('div')
        terminal.id = "terminal"
        terminal.setAttribute("tabIndex", 1)
        document.body.appendChild(terminal)
        //br()
    }

    const { WasmTerminal } = await import("./vtx.js")

    vm.vt = new WasmTerminal("terminal", 132, 42, [
            { url : "./xtermjsixel/xterm-addon-image-worker.js", sixelSupport:true }
    ] )
}


// simple <pre> output
function feat_stdout() {
    var stdout = document.getElementById('stdout')
    if (!stdout){
        stdout = document.createElement('pre')
        stdout.id = "stdout"
        stdout.style.whiteSpace = "pre-wrap"
        stdout.hidden = false
        document.body.appendChild(stdout)
    }
    stdout.write = function (text) {
        var buffer = stdout.innerHTML.split("\r\n")
        for (const line of text.split("\r\n") ) {
            if (line.length) {
                buffer.push( line )
            }
        }

        while (buffer.length>25)
            buffer.shift()

        stdout.innerHTML =  buffer.join("\n")

    }
    vm.vt.xterm = stdout
}

// TODO make a queue, python is not always ready to receive those events
// right after page load

function feat_lifecycle() {
        window.addEventListener("focus", function(e){
            queue_event("focus", e )
        })

        window.addEventListener("blur", function(e){
            queue_event("blur", e )
        })
/*
    // Enable navigation prompt
    window.onbeforeunload = function() {
        return true;
    }
*/
//    window.onbeforeunload =    "Are you sure you want to leave?";
        window.onbeforeunload = function() {
            var message = "Are you sure you want to navigate away from this page ?";
                if (confirm(message)) return message;
                else return false;
        }

}



async function onload() {
    var debug_hidden = true;

    // TODO:  -x
    if ( location.hash.search("#debug")>=0) {
        debug_hidden = false;
        vm.config.gui_divider = 2
        console.warn("DEBUG MODE")
    }


    function br(){
        document.body.appendChild( document.createElement('br') )
    }

    feat_lifecycle()





    for (const feature of vm.config.features) {



        if (feature.startsWith("gui")) {
            feat_gui(debug_hidden)
        }


        // file upload widget

        if (feature.startsWith("fs")) {
            feat_fs(debug_hidden)
        }


        // TERMINAL

        if (feature.startsWith("vt")) {

            // simpleterm.js

            if (feature === "vt") {
                await feat_vt(debug_hidden)

            }

            // xterm.js

            if (feature === "vtx") {
                await feat_vtx(debug_hidden)
            }

        }


        if (feature.startsWith("stdout")){
            feat_stdout()
        }
    }

    if (window.custom_onload)
        window.custom_onload(debug_hidden)


    window.busy--;

    vm.vt.xterm.write('OK\r\nPlease \x1B[1;3;31mwait\x1B[0m ...\r\n')


    window.Module = vm

    if (window.window_resize)
        window_resize(vm.config.gui_divider)

    console.warn("Loading python interpreter from", config.executable)
    const jswasmloader=document.createElement('script')
    jswasmloader.setAttribute("type","text/javascript")
    jswasmloader.setAttribute("src", config.executable )
    jswasmloader.setAttribute('async', true);
    document.getElementsByTagName("head")[0].appendChild(jswasmloader)

}


window.busy = 1

window.addEventListener("load", onload )



async function media_prepare(trackid) {
    const track = MM[trackid]

    await _until(defined)("avail", track)

    if (track.type === "audio") {
        //console.log(`audio ${trackid}:${track.url} ready`)
        return trackid
    }

    if (track.type === "mount") {
        // async
        MM[trackid].media = vm.BFS.Buffer.from( MM[trackid].data )

        track.mount.path ??= '/'

        const hint = `${track.mount.path}@${track.mount.point}:${trackid}`

        function apk_cb(e, apkfs){
            console.log(__FILE__, "930 mounting", hint, "onto", track.mount.point)

            BrowserFS.FileSystem.InMemory.Create(
                function(e, memfs) {
                    BrowserFS.FileSystem.OverlayFS.Create({"writable" :  memfs, "readable" : apkfs },
                        function(e, ovfs) {
                            BrowserFS.FileSystem.MountableFileSystem.Create({
                                '/' : ovfs
                                }, async function(e, mfs) {
                                    await BrowserFS.initialize(mfs);
                                    await vm.FS.mount(vm.BFS, {root: track.mount.path}, track.mount.point );
                                    setTimeout(()=>{track.ready=true}, 0)
                                })
                        }
                    );
                }
            );
        }

        await BrowserFS.FileSystem.ZipFS.Create(
            {"zipData" : track.media, "name": hint},
            apk_cb
        )
    }
}

// event queue

window.EQ = []



// media manager


window.MM = { tracks : 0 }


window.cross_dl = async function cross_dl(trackid, url, autoready) {
    var response = await fetch(url);

    const reader = response.body.getReader();

    const len = +response.headers.get("Content-Length");



    // concatenate chunks into single Uint8Array
    MM[trackid].data = new Uint8Array(len);
    MM[trackid].pos = 0
    MM[trackid].len = len

    console.warn(url, MM[trackid].len)

    while(true) {
        const {done, value} = await reader.read()

        if (done) {
            MM[trackid].avail = true
            return
        }

        MM[trackid].data.set(value, MM[trackid].pos)

        MM[trackid].pos += value.length

        console.log(`${trackid}:${url} Received ${MM[trackid].pos} of ${MM[trackid].len}`)
    }
}


MM.prepare = function prepare(url, cfg) {
        MM.tracks++;
        const trackid = MM.tracks
        var audio

        cfg = JSON.parse(cfg)


        const transport = cfg.io || 'packed'
        const type = cfg.type || 'bin'

        MM[trackid] = { ...cfg, ...{
                "trackid": trackid,
                "type"  : type,
                "url"   : url,
                "error" : false,
                "len"   : 0,
                "pos"   : 0,
                "io"    : transport,
                "ready" : undefined,
                "avail" : undefined,
                "media" : undefined,
                "data"  : undefined
            }
        }
        const track = MM[trackid]

//console.log("MM.prepare", trackid, transport, type)

        if (transport === 'fs') {
            if ( type === "audio" ) {
                const blob = new Blob([FS.readFile(track.url)])
                audio = new Audio(URL.createObjectURL(blob))
                track.avail = true
            } else {
                console.error("fs transport is only for audio", JSON.stringify(track))
                track.error = true
                return track
            }
        }

        if (transport === "url" ) {
            // audio tag can download itself
            if ( type === "audio" ) {
                audio = new Audio(url)
                track.avail = true
            } else {
console.log("MM.cross_dl", trackid, transport, type, url )
                cross_dl(trackid, url)
            }
        }


        if (audio) {
            track.set_volume = (v) => { track.media.volume = 0.0 + v }
            track.media = audio
            track.play = () => { track.media.play() }
            track.stop = () => { track.media.pause() }
        }

//console.log("MM.prepare", url,"queuing as",trackid)
        media_prepare(trackid)
//console.log("MM.prepare", url,"queued as",trackid)
    return track
}







MM.load = function load(trackid, loops) {
// loops =0 play once, loops>0 play number of time, <0 loops forever
    const track = MM[trackid]

    loops ??= 0
    track.loops = loops

    if (!track.avail) {
        // FS not ready
        console.error("981 TODO: bounce with setTimeout")
        return 0
    }


    if (track.type === "audio") {
        const media = track.media

        media.addEventListener("canplaythrough", (event) => {
            track.ready = true
            if (track.auto)
                media.play()
        })

        media.addEventListener('ended', (event) => {
            if (track.loops<0)
                media.play()

            if (track.loops>0) {
                track.loops--;
                media.play()
            }
        })

        return trackid
    }

    if (track.type === "mount") {
        const mount = track
        console.log(track.mount.point , track.mount.path, trackid )
        mount_ab( track.data , track.mount.point , track.mount.path, trackid )
        return trackid
    }
// unsupported type
    return -1
}


MM.play = function play(trackid, loops, start, fade_ms) {
//console.log("MM.play",trackid, loops, MM[trackid] )
            const track = MM[trackid]
            track.loops = loops
            if (track.ready)
                track.media.play()
            else {
                console.warn("Cannot play before user interaction, will retry", track )
                function play_asap() {
                    if (track.ready) {
                        track.media.play()
                    } else {
                        setTimeout(play_asap, 500)
                    }
                }
                play_asap()
            }
}

MM.stop = function stop(trackid) {
//console.log("MM.stop", trackid, MM[trackid] )
            MM[trackid].media.pause()
}

if (navigator.connection) {
    if ( navigator.connection.type === 'cellular' ) {
        console.warn("Connection:","Cellular")
        if ( navigator.connection.downlinkMax <= 0.115) {
            console.warn("Connection:","2G")
        }
    } else {
        console.warn("Connection:","Wired")
    }
}


//TODO battery








