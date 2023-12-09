"use strict";

const PKG = (()=>{var e=location.pathname.split("/");e.pop(); return e.pop()})()
const textDecoder = new TextDecoder()
function unhex_utf8(s) {
    var ary = []
    for ( var i=0; i<s.length; i+=2 ) {
        ary.push( parseInt(s.substr(i,2),16) )
    }
    return textDecoder.decode( new Uint8Array(ary) )
}

function to_hex(o) {
    const json = unescape(encodeURIComponent(JSON.stringify(o)))
    var rv = ''
    for (var i = 0; i < json.length; i++) {
        rv += json.charCodeAt(i).toString(16)
    }
    return rv
}

function rx(event) {
    const rxmsg = ""+event.data
    const origin = event.origin
    var stack = JSON.parse(unhex_utf8(rxmsg))
    const serial = stack.shift()
    const fn = stack.shift()
    var argv = stack.shift()
    argv.push( stack.shift() )
    console.warn(PKG,'.', fn,'(', argv,')', serial)
    if (!window[fn])
        console.error("bus(23)", serial, fn, argv)
    else {
        if (serial=="C0")
            window[fn](...argv)
        else {
            var result = window[fn](...argv)
            if (result===undefined)
                result = null
            window.parent.postMessage("dlfcn:"+serial+":"+ to_hex(result),  document.referrer)
        }
    }
}

window.addEventListener("message", rx, false);

function linked() {
    window.parent.postMessage("dlfcn::"+ location.hash ,  document.referrer)
}
