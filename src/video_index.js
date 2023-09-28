import * as tf from '@tensorflow/tfjs'


import {tfjsResearch} from './main';
const research = new tfjsResearch()


import {FaceDetector} from './functions'
const faceDetector = new FaceDetector()


import {PoseDetector} from './functions'
const poseDetector = new PoseDetector()


import {ObjectDetector} from './functions'
const objectDetector = new ObjectDetector()


const settings = {
    "setCamera": false,
    "video_element_id": "webcam",

    "debug": true
}
settings["posenet_function_list"] = [pose_frame_handle, send_pose_json_to_server]
settings["no_pose_frame_function_list"] = [no_pose_frame_handle]
research.set_dict(settings)


async function init() {
    await faceDetector.init()

    await poseDetector.init()

    await objectDetector.init()

    await research.init()
}


document.getElementById(settings.video_element_id).src = "demo.mp4"
init()





let my_socket = new WebSocket("ws://localhost:8000")

async function send_pose_json_to_server(myMap, canvas) {
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

    const one_frame_of_data = JSON.stringify(new_parts_list)
    my_socket.send(one_frame_of_data)
}






let tracking_list = []
let people_passby = 0

async function pose_frame_handle(myMap, canvas) {
    const current_parts_list = Array.from( myMap.keys() )

    // detect something about face if we got face points
    if (current_parts_list.includes("rightEye") && current_parts_list.includes("leftEye") && current_parts_list.includes("rightEar") && current_parts_list.includes("leftEar") && current_parts_list.includes("nose")) {
        // This is for age and gender
        const feedback_handle = function (age_and_gender) { 
            if (age_and_gender != undefined) { 
                console.log("")
                console.log('age: ', age_and_gender.age)
                console.log('gender: ', age_and_gender.gender)
                console.log('same person: ', age_and_gender.same_person)
            } 
        } 
        await faceDetector.detectAgeAndGender(canvas, [feedback_handle])

        // This is for head direction
        const result = await poseDetector.head_pose(myMap)
        console.log(result)
    } 

    // we can't say it's a person if we don't have enough body parts
    if (current_parts_list.length < 8) {
        return
    }

    // detect standing_or_sitting based on myMap
    const standing_or_sitting = await poseDetector.standing_or_sitting(myMap)
    if (standing_or_sitting != undefined) { 
        console.log("")
        console.log(standing_or_sitting)
    }

    // detect front_or_side based on myMap
    const front_or_side = await poseDetector.front_or_side(myMap)
    if (front_or_side != undefined) { 
        console.log("")
        console.log(front_or_side)
    }

    // know if people are looking product(hands) based on myMap
    const are_they_looking_their_hands = await poseDetector.are_they_looking_their_hands(myMap)
    if (are_they_looking_their_hands != undefined) {
        console.log("")
        console.log("looking hands: ", are_they_looking_their_hands)

        // which object they are looking?
        const object_name = await objectDetector.whats_object_in_hands(myMap, canvas)
        if (object_name != undefined) {
            console.log("")
            console.log(object_name)
        }
    }

    let x_list = []
    let y_list = []
    current_parts_list.forEach( key => {
        const x = myMap.get(key).position.x
        const y = myMap.get(key).position.y
        x_list.push(x)
        y_list.push(y)
    })
    const person_width = tf.tidy(() => {
        return Math.abs(tf.tensor1d(x_list).max().dataSync() - tf.tensor1d(x_list).min().dataSync())
    })
    const center_x = tf.tidy(() => {
        return tf.tensor1d(x_list).mean().dataSync()
    })
    const center_y = tf.tidy(() => {
        return tf.tensor1d(y_list).mean().dataSync()
    })
    const current_distance = (center_x**2 + center_y**2)**(1/2)


    if (tracking_list.length == 0) {
        const person = {
            "id": 0,
            "distance": current_distance,
            "direction": undefined,
            "frames_after_last_show": 0,
            //"exist_time"
            //all_frames
            //looking_hands_frames
            //"hands_object"
        }
        tracking_list.push(person)

        //console.log("added a init person")
    }

    // Tracking process
    let diff_list = []
    tracking_list.forEach( dict => {
        const diff = Math.abs(dict["distance"] - current_distance)
        diff_list.push(diff)
    })
    const the_most_like_person_index = tf.tidy( () => {
        return tf.tensor(diff_list).argMin().dataSync()
    })

    let id
    if ((diff_list[the_most_like_person_index] < canvas.width*0.5) || (person_width==0)) { // means the distance is tolerable
        tracking_list[the_most_like_person_index]["distance"] = current_distance

        id = tracking_list[the_most_like_person_index]["id"]

        tracking_list[the_most_like_person_index].frames_after_last_show = 0
        tracking_list.forEach( person => {
            if (person.id != id) {
                person.frames_after_last_show = person.frames_after_last_show + 1
            }
        })

        const ctx = canvas.getContext("2d")
        ctx.font="80px Verdana"
        ctx.fillStyle="red"
        //ctx.fillText(id, center_x, center_y)
        ctx.fillText(people_passby, center_x, center_y)
    }
    else { // maybe it's a new person
        let current_ids = []
        tracking_list.forEach( person => {
            current_ids.push(person.id)
        })
        //console.log(current_ids)
        let num = 0
        while(1) {
            if (!current_ids.includes(num)) {
                id = num
                break
            }
            num += 1
        }

        const person = {
            "id": id,
            "distance": current_distance,
            "direction": undefined,
            "frames_after_last_show": 0,
        }
        tracking_list.push(person)

        //console.log("added a new person")
    }

    // Right and Left boundary
    const ratio = 0.3
    if ((center_x < canvas.width*ratio) || (center_x > canvas.width*(1-ratio))) {
        let direction
        if (center_x < canvas.width*ratio) { //left boundary
            direction = "left"
        }
        else if (center_x > canvas.width*(1-ratio)) { //right boundary
            direction = "right"
        }
        tracking_list.forEach( person => {
            if (person.id == id) {
                person.direction = direction
            }
        })
    }

    // If person has gone
    tracking_list.forEach( (person, index) => {
        if (person.frames_after_last_show > 5) {//50
            people_passby += 1
            document.getElementById("people_passby").innerText = "people_passby: " + String(people_passby) + " \n This time, the man went to the " + person.direction

            tracking_list.splice(index, 1)
        }
    })

}


async function no_pose_frame_handle(canvas) {
    tracking_list.forEach( person => {
        person.frames_after_last_show = person.frames_after_last_show + 1
    })

    tracking_list.forEach( (person, index) => {
        if (person.frames_after_last_show > 5) {//50
            people_passby += 1
            document.getElementById("people_passby").innerText = "people_passby: " + String(people_passby) + " \n This time, the man went to the " + person.direction

            tracking_list.splice(index, 1)
        }
    })
}
