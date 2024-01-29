var pitch = {step: 0, min: 1.0, max: 4}
var audioCtx, audioData
var source
var intervalId

function start(e) {
    if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()

    if (!source) {
        source = audioCtx.createBufferSource();

        audioCtx.decodeAudioData(audioData, function(buffer) {
            source.buffer = buffer;
            source.loop = true;
            source.connect(audioCtx.destination);
            source.start();
        })

        intervalId = setInterval(function(){
          var currPitch = source.playbackRate.value;

          if ((pitch.step < 0 && currPitch > pitch.min) ||
              (pitch.step > 0 && currPitch < pitch.max)) {
            source.playbackRate.value += pitch.step;
          }
        }, 50);
    }
}

function hi() {
    pitch.step = 0.15
    return pitch.step
}

function lo() {
    pitch.step = -0.08
    return pitch.step
}

function stop(e){
    if (source) {
        source.stop();
        source = null;
        clearInterval(intervalId);
    }
}


function init(){
    var start = document.getElementById("start")
    var stop = document.getElementById("stop")
    var xhr = new XMLHttpRequest()

    xhr.open("GET", "engine.ogg", true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function(e){
        audioData = this.response;
        console.log("engine sound loaded")
    }
    xhr.send()
}

init()
init = null


