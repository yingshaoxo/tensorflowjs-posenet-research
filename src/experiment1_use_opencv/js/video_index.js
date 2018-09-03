import {tfjsResearch} from './main';


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

    research.detectPoseInRealTime([handle_pose_parts])
}


let my_socket = new WebSocket("ws://localhost:8000")

function handle_pose_parts(myMap, canvas) {
    const parts_dict = {
        "rightWrist": 1,
        "rightElbow": 2,
        "rightShoulder": 3,
        "rightHip": 4,
        "rightKnee": 5,
        "rightAnkle": 6,

        "leftWrist": 7,
        "leftElbow": 8,
        "leftShoulder": 9,
        "leftHip": 10,
        "leftKnee": 11,
        "leftAnkle": 12,

        "rightEye": 13,
        "rightEar": 14,
        "leftEye": 15,
        "leftEar": 16,
        "nose": 17,
    }

    const current_parts_list = Array.from( myMap.keys() )

    let new_parts_list = []

    Object.entries(parts_dict).forEach( ([key, value]) => {
        if (current_parts_list.includes(key)) {
            new_parts_list.push([myMap.get(key).position.x, myMap.get(key).position.y])
        } else {
            new_parts_list.push([0, 0])
        }
    })

    canvas.toBlob(function(blob) {
        const one_frame_of_data = JSON.stringify(new_parts_list)
        my_socket.send(one_frame_of_data)

        my_socket.send(blob)
    })
}



document.getElementById(settings.video_element_id).src = "demo.mp4"
init()
