import {tfjsResearch} from './main';
const $ = require("jquery")


const research = new tfjsResearch()

const settings = {
    "setCamera": false,
    "video_element_id": "webcam",

    "poseNet": true,
    "faceNet": false,

    "debug": true
}

research.set_dict(settings)


async function init() {
    await research.init()

    research.detectPoseInRealTime()
}


$("#url_box").keyup(function(e){
    if((e.keyCode || e.which) == 13) { //Enter keycode
        document.getElementById(settings.video_element_id).src = document.getElementById("url_box").value
        setTimeout(function(){ document.getElementById("url_box").value = "" }, 1000);
        setTimeout(function(){ init() }, 1000);
    }
})
