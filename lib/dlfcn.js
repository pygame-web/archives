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

function rx(event) {
    const rxmsg = ""+event.data
    const origin = event.origin
    var stack = JSON.parse(unhex_utf8(rxmsg))
    const fn = stack.shift()
    var argv = stack.shift()
    argv.push( stack.shift() )
    console.warn(PKG,'.', fn,'(', argv,')')
    window[fn](...argv)
}

window.addEventListener("message", rx, false);

function linked() {
    window.parent.postMessage("dlfcn:"+PKG+":"+ location.hash ,  document.referrer)
}
