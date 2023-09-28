import * as tf from '@tensorflow/tfjs'
import * as tfc from '@tensorflow/tfjs-core'

const faceapi = require("face-api.js")

//import * as Posenet from '@tensorflow-models/posenet'
import * as Posenet from './posenet/index.js'
import {drawKeypoints, drawSkeleton} from './posenet_util.js'

const $ = require("jquery")

import {setupCamera} from './webcam'


// This is for all
let video_element
let videoWidth
let videoHeight
let canvas_element

// This is for debug
let break_button
let should_pause = false

// This is for pose keypoints detection
let posenet;
const imageScaleFactor = 0.5
const outputStride = 16
const minPoseConfidence = 0.1
const minPartConfidence = 0.5


export class tfjsResearch {
    constructor() {
        this.dict = {
            "setCamera": true,

            "video_element_id": "webcam",
            "videoWidth": 640,
            "videoHeight": 500,
            
            "canvas_element_id": "overlay",

            "posenet_function_list": [],
            "no_pose_frame_function_list": [],

            "debug": false
        }
    }

    set(key, value) {
        this.dict[key] = value
    }

    set_dict(new_dict) {
        Object.entries(new_dict).forEach(([key, value]) => {
            this.set(key, value)
        })
    }

    async init() {
        console.log('start initialization...')


        videoWidth = this.dict["videoWidth"]
        videoHeight = this.dict["videoHeight"]
        if (this.dict["setCamera"]) {
            video_element = await setupCamera(this.dict["video_element_id"], videoWidth, videoHeight)

            console.log("camera loaded")
        } else {
            video_element = document.getElementById(this.dict["video_element_id"])

            console.log("video loaded")
        }

        canvas_element = $('#' + this.dict["canvas_element_id"]).get(0)

        if (this.dict["debug"]) {
            const debug_button = $('#debug_button')
            debug_button.show()
            debug_button.on('click', function() {
                if (should_pause == false) {
                    should_pause = true
                    $('#debug_button').html("Start")
                } else {
                    should_pause = false
                    $('#debug_button').html("Pause")
                }
            })
        }

        posenet = await Posenet.load(0.75)


        console.log('initialization completed')

        detectPoseInRealTime(this.dict["posenet_function_list"], this.dict["no_pose_frame_function_list"])
    }

}


async function detectPoseInRealTime(list_of_functions, no_pose_functions) {

    if (list_of_functions == []) {
        list_of_functions = undefined
    }

    if (no_pose_functions == []) {
        no_pose_functions = undefined
    }

    posenet_loop(list_of_functions, no_pose_functions)
}


async function posenet_loop(list_of_functions, no_pose_functions) {
    video_element.width = videoWidth 
    video_element.height = videoHeight
    canvas_element.width = video_element.width
    canvas_element.height = video_element.height

    const canvas = canvas_element
    const ctx = canvas.getContext('2d')
    const flipHorizontal = true

    let current_person = 0
    let counting_temp_dict = {}

    let previous_person = 0
    let all_person_i_met = 0

    while (true) {
        if (should_pause == false) {
            const poses = await posenet.estimateMultiplePoses(video_element, imageScaleFactor, flipHorizontal, outputStride)

            ctx.clearRect(0, 0, videoWidth, videoHeight)
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-videoWidth, 0);
            ctx.drawImage(video_element, 0, 0, videoWidth, videoHeight);
            ctx.restore();

            // counting current people
            if (counting_temp_dict[poses.length] == undefined) {
                counting_temp_dict[poses.length] = 0
            }
            counting_temp_dict[poses.length] = counting_temp_dict[poses.length] + 1
            if (counting_temp_dict[poses.length] > 5) {
                current_person = poses.length
                counting_temp_dict = {}
            }
            console.log("current people num: ", current_person)

            // counting all people I have met before
            if (current_person > previous_person) {
                all_person_i_met += 1
            }
            previous_person = current_person
            console.log("all people num: ", all_person_i_met)
            

            // pose iterate
            if (poses.length > 0) {

                poses.forEach(({score, keypoints}) => {
                    if (score >= minPoseConfidence) {
                        var myMap = new Map(); //it's actually a dict in python

                        keypoints.forEach((obj) => {
                            if (obj.score >= minPartConfidence) {
                                myMap.set(obj.part, obj)
                            }
                        })


                        if (list_of_functions != undefined) {
                            list_of_functions.forEach(func => {
                                func(myMap, canvas)
                            })
                        }

                        // draw points on screen
                        drawKeypoints(keypoints, minPartConfidence, ctx);
                        drawSkeleton(keypoints, minPartConfidence, ctx);
                    }
                })
            }
            else {
                if (no_pose_functions != undefined) {
                    no_pose_functions.forEach(func => {
                        func(canvas)
                    })
                }
            }

        }

    await tf.nextFrame() //realese control, stop blocking main threading
    }
}
