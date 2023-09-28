import * as tf from '@tensorflow/tfjs'

import {pose_classes} from './pose_classes.js'
import {motion_classes} from './motion_classes.js'
import {looking_classes} from './looking_classes.js'


// This is for pose keypoints detection
let posenet;
const imageScaleFactor = 0.5
const outputStride = 16
const minPoseConfidence = 0.1
const minPartConfidence = 0.5


// This is for pose_detect, for example, standing or sitting
let pose_detect_model

// This is for motion_detect, for example, be left or right
let motion_detecte_model
let tracking_list = []
let people_passby = 0

// This is for object detection
import {MobileNet} from './mobilenet';
let object_detection_mobilenet

// This is for looking_product detection
let looking_product_model


export class FaceDetector {
    constructor() {
        this.dict = {
            "people_face": undefined,

            "debug": true,
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
        this.dict['faceapi'] = require("face-api.js")

        await this.dict.faceapi.loadFaceDetectionModel('./face_models')
        await this.dict.faceapi.loadFaceLandmarkModel('./face_models')
        await this.dict.faceapi.loadFaceRecognitionModel('./face_models')

        this.dict['age_model'] = await tf.loadModel('./age_models/model.json')

        console.log("faceNet loaded")
    }

    async detectAgeAndGender(canvas, function_list) {
        let dict_result = {}
        const ctx = canvas.getContext('2d')

        const input = await this.dict.faceapi.toNetInput(canvas)
        const minConfidence = 0.6
        const locations = await this.dict.faceapi.locateFaces(input, minConfidence)
        var faceImages = await this.dict.faceapi.extractFaces(input.inputs[0], locations)

        faceImages.forEach(async (faceCanvas, i) => {
            // detect if has seen a person before
            const same = await this.is_the_same_person(faceCanvas)
            if (same == true) {
                dict_result['same_person'] = true
            } else if (same == false) {
                dict_result['same_person'] = false
            }
            
            var img = tf.fromPixels(faceCanvas)
            const size = Math.min(img.shape[0], img.shape[1]);
            const centerHeight = img.shape[0] / 2;
            const beginHeight = centerHeight - (size / 2);
            const centerWidth = img.shape[1] / 2;
            const beginWidth = centerWidth - (size / 2);
            img = img.slice([beginHeight, beginWidth, 0], [size, size, 3]);
            img = img.resizeBilinear([64, 64])
            img = img.expandDims(0);
            img = img.toFloat();

            tf.tidy(() => {
                const results = this.dict.age_model.predict(img)

                const predicted_genders = results[0].dataSync()
                if (predicted_genders[0] > 0.5) {
                    dict_result['gender'] = "female"
                    //console.log("Female")
                } else {
                    dict_result['gender'] = "male"
                    //console.log("Male")
                }
                
                const ages = tf.range(0, 101, 1).reshape([101, 1])
                const predicted_ages = results[1].dot(ages).flatten().dataSync()
                dict_result['age'] = Math.round(predicted_ages[0] - 15)
            })

            if (function_list != undefined) {
                function_list.forEach(func => {
                    func(dict_result)
                })
            }
        })
    }

    async is_the_same_person(new_face) {
        if (this.dict.people_face == undefined) {
            this.dict.people_face = new_face
            return false
        }

        const old_face = this.dict.people_face

        const descriptor1 = await this.dict.faceapi.computeFaceDescriptor(new_face)
        const descriptor2 = await this.dict.faceapi.computeFaceDescriptor(old_face)
        const distance = this.dict.faceapi.euclideanDistance(descriptor1, descriptor2)

        if (distance < 0.6) {
            return true
        }
        else {
            this.dict.people_face = new_face
            return false
        }
    }
}


export class PoseDetector {
    constructor() {
        this.dict = {
            "debug": true,
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
        this.dict['standing_or_sitting_model'] = await tf.loadModel('./standing_or_sitting_models/model.json')
        console.log("standing_or_sitting_model loaded")

        this.dict['front_or_side_model'] = await tf.loadModel('./front_or_side_models/model.json')
        console.log("front_or_side_model loaded")

        this.dict['are_they_looking_their_hands_model'] = await tf.loadModel('./are_they_looking_their_hands_models/model.json')
        console.log("are_they_looking_their_hands_model loaded")

        console.log("poseNet loaded")
    }

    async head_pose(myMap) {
        let dict_result = {
            "right_or_left": undefined,
            "up_or_down": undefined,
        }

        const current_parts_list = Array.from( myMap.keys() )

        const leftEye = current_parts_list.includes('leftEye')
        const rightEye = current_parts_list.includes('rightEye')
        const leftEar = current_parts_list.includes('leftEar')
        const rightEar = current_parts_list.includes('rightEar')
        const nose = current_parts_list.includes('nose')

        // for detecting whether head is turning left or right
        if ( leftEye && rightEye ) {
            if ( (leftEar == false) && (rightEar == true) ) {
                dict_result.right_or_left = "right"

            } else if ( (leftEar == true) && (rightEar == false) ) {
                dict_result.right_or_left = "left"

            } else if ( (leftEar == true) && (rightEar == true) ) {
                dict_result.right_or_left = "straight"

            }
        }

        // for detecting whether head is turning up or down
        if (nose) {
            if (leftEye && leftEar) {
                const ear_y = myMap.get("leftEar").position.y
                const eye_y = myMap.get("leftEye").position.y
                const nose_y = myMap.get("nose").position.y
                const distance_adds = (Math.abs(eye_y - nose) * 0.03)

                if (ear_y < eye_y + distance_adds) {
                    dict_result.up_or_down = "down"
                } else {
                    dict_result.up_or_down = "up"
                }
                
            } else if (rightEye && rightEar) {
                const ear_y = myMap.get("rightEar").position.y
                const eye_y = myMap.get("rightEye").position.y
                const nose_y = myMap.get("nose").position.y
                const distance_adds = (Math.abs(eye_y - nose) * 0.03)

                if (ear_y < eye_y + distance_adds) {
                    dict_result.up_or_down = "down"
                } else {
                    dict_result.up_or_down = "up"
                }
            }
        }

        return dict_result
    }

    async standing_or_sitting(myMap) {
        let final_result

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

        // for detect sitting or standing
        if ( (current_parts_list.includes("leftHip") || current_parts_list.includes("rightHip")) && (current_parts_list.includes("leftKnee") || current_parts_list.includes("rightKnee")) ) {
            let points_list = []
            Object.entries(parts_dict).forEach( ([key, value]) => {
                if (current_parts_list.includes(key)) {
                    const x = myMap.get(key).position.x
                    const y = myMap.get(key).position.y
                    points_list.push(x)
                    points_list.push(y)
                } else {
                    const x = 0
                    const y = 0
                    points_list.push(x)
                    points_list.push(y)
                }
            })


            tf.tidy(() => {
                let raw_data = [points_list]
                const raw_tensor = tf.tensor(raw_data)

                //normalize: let value keep in 0 and 1
                const normalized_tensor = raw_tensor.sub(tf.min(raw_tensor)).div(tf.max(raw_tensor).sub(tf.min(raw_tensor)))

                const predicted = this.dict["standing_or_sitting_model"].predict(normalized_tensor)
                var predicted_result = predicted.argMax(1).dataSync() // argMax(): get the index of max value in a list

                const result = Math.round(predicted_result)

                const pose_classes_length = Object.keys(pose_classes).length
                if ((result >= pose_classes_length) || (result < 0)) {
                    final_result = undefined //bad case, beyoud labeled_tag
                } else {
                    final_result = pose_classes[result]
                }
            })
        }

        return final_result //means nothing has been detected
    }

    async front_or_side(myMap) {
        let final_result 

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

        if ((current_parts_list.includes("leftHip") || current_parts_list.includes("rightHip")) && (current_parts_list.includes("leftKnee") || current_parts_list.includes("rightKnee")) ) {

            let points_list = []
            Object.entries(parts_dict).forEach( ([key, value]) => {
                if (current_parts_list.includes(key)) {
                    const x = myMap.get(key).position.x
                    const y = myMap.get(key).position.y
                    points_list.push(x)
                    points_list.push(y)
                } else {
                    const x = 0
                    const y = 0
                    points_list.push(x)
                    points_list.push(y)
               }
            })

            tf.tidy(() => {
                let raw_data = [points_list]
                const raw_tensor = tf.tensor(raw_data)

                //normalize: let value keep in 0 and 1
                const normalized_tensor = raw_tensor.sub(tf.min(raw_tensor)).div(tf.max(raw_tensor).sub(tf.min(raw_tensor)))

                const predicted = this.dict["front_or_side_model"].predict(normalized_tensor)
                var predicted_result = predicted.argMax(1).dataSync() // argMax(): get the index of max value in a list

                const result = Math.round(predicted_result)

                const motion_classes_length = Object.keys(motion_classes).length
                if ((result >= motion_classes_length) || (result < 0)) {
                    final_result = undefined //bad case, beyoud labeled_tag
                } else {
                    final_result = motion_classes[result]
                }
            })
        }

        return final_result //means nothing has been detected
    }

    async are_they_looking_their_hands(myMap) {
        let final_result 

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

        let points_list = []
        Object.entries(parts_dict).forEach( ([key, value]) => {
            if (current_parts_list.includes(key)) {
                const x = myMap.get(key).position.x
                const y = myMap.get(key).position.y
                points_list.push(x)
                points_list.push(y)
            } else {
                const x = 0
                const y = 0
                points_list.push(x)
                points_list.push(y)
            }
        })

        tf.tidy(() => {
            let raw_data = [points_list]
            const raw_tensor = tf.tensor(raw_data)

            //normalize: let value keep in 0 and 1
            const normalized_tensor = raw_tensor.sub(tf.min(raw_tensor)).div(tf.max(raw_tensor).sub(tf.min(raw_tensor)))

            const predicted = this.dict['are_they_looking_their_hands_model'].predict(normalized_tensor)
            var predicted_result = predicted.argMax(1).dataSync() // argMax(): get the index of max value in a list

            raw_tensor.dispose()
            normalized_tensor.dispose()

            const result = Math.round(predicted_result)

            const classes_length = Object.keys(looking_classes).length
            if ((result >= classes_length) || (result < 0)) {
                final_result = undefined //bad case, beyoud labeled_tag
            } else {
                final_result = looking_classes[result]
            }
        })

        return final_result
    }
}


export class ObjectDetector {
    constructor() {
        this.dict = {
            "debug": true,
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
        this.dict['object_detection_mobilenet'] = new MobileNet()
        await this.dict['object_detection_mobilenet'].load()

        console.log("object model loaded")
    }

    async whats_object_in_hands(myMap, canvas) {
        let final_result = undefined

        const object_canvas_list = await this.get_hands_canvas(myMap, canvas)
        if (object_canvas_list != undefined) { 
            object_canvas_list.forEach((object_canvas) => {
                const object_name = this.recognize_object(object_canvas)
                if (object_name != undefined) { 
                    final_result = object_name
                    return //this only breaks `list.forEach`, the last level function
                } 
            })
        } 

        return final_result
    }

    async get_hands_canvas(myMap, canvas) {
        let canvas_list = []

        const current_parts_list = Array.from( myMap.keys() )
        let parts_we_need = []

        if (current_parts_list.includes("rightWrist") && current_parts_list.includes("rightElbow")) {
            parts_we_need.push("rightWrist")
        } else if (current_parts_list.includes("leftWrist") && current_parts_list.includes("leftElbow")) {
            parts_we_need.push("leftWrist")
        } else {
            return undefined
        }

        parts_we_need.forEach( key => {
            const wrist_x = myMap.get(key).position.x
            const wrist_y = myMap.get(key).position.y

            let elbow_x, elbow_y
            if (key == "rightWrist") {
                elbow_x = myMap.get("rightElbow").position.x
                elbow_y = myMap.get("rightElbow").position.y
            } else if (key == "leftWrist") {
                elbow_x = myMap.get("leftElbow").position.x
                elbow_y = myMap.get("leftElbow").position.y
            }

            //calculations for the real object points
            let x, y
            const coefficient = 3
            x = wrist_x - (elbow_x - wrist_x)/coefficient
            y = wrist_y - (elbow_y - wrist_y)/coefficient
            x = canvas.width - x // mirror flip

            const object_size = 224/ 2 // 224 is the smallest pixel size mobile net needed

            const object_canvas = document.createElement('canvas');
            object_canvas.width = object_size*2
            object_canvas.height= object_size*2
            const ctx = object_canvas.getContext('2d');

            const box = [x-object_size, y-object_size, object_size*2, object_size*2]
            ctx.drawImage(canvas, box[0], box[1], box[2], box[3], 0, 0, object_canvas.width, object_canvas.height)

            /*
                // example: https://stackoverflow.com/questions/26015497/how-to-resize-then-crop-an-image-with-canvas
                Position the image on the canvas:
                :	context.drawImage(img,x,y);

                Position the image on the canvas, and specify width and height of the image:
                :	context.drawImage(img,x,y,width,height);

                Clip the image and position the clipped part on the canvas:
                :	context.drawImage(img,sx,sy,swidth,sheight,x,y,width,height);
             */

            canvas_list.push(object_canvas)
        })

        return canvas_list
    }

    recognize_object(canvas) {
        const VIDEO_PIXELS = 224

        const result = tf.tidy(() => {
            // For UX reasons we spread the video element to 100% of the screen
            // but our traning data is trained against 244px images. Before we
            // send image data from the camera to the predict engine we slice a
            // 244 pixel area out of the center of the camera screen to ensure
            // better matching against our model.
            const pixels = tf.fromPixels(canvas);
            const centerHeight = pixels.shape[0] / 2;
            const beginHeight = centerHeight - (VIDEO_PIXELS / 2);
            const centerWidth = pixels.shape[1] / 2;
            const beginWidth = centerWidth - (VIDEO_PIXELS / 2);
            const pixelsCropped =
                  pixels.slice([beginHeight, beginWidth, 0],
                               [VIDEO_PIXELS, VIDEO_PIXELS, 3]);

            return this.dict['object_detection_mobilenet'].predict(pixelsCropped);
        })

        const topK = this.dict['object_detection_mobilenet'].getTopKClasses(result, 10);
        
        return topK[0].label
    }
}


export class Drawer{
    constructor() {
        this.dict = {
            "debug": true,
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
        console.log("Drawer loaded")
    }

    async draw_text(myMap, canvas, text, x, y) {
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

        let points_list = []
        let x_list = []
        let y_list = []
        Object.entries(parts_dict).forEach( ([key, value]) => {
            if (current_parts_list.includes(key)) {
                const x = myMap.get(key).position.x
                const y = myMap.get(key).position.y
                x_list.push(x)
                y_list.push(y)
                points_list.push(x)
                points_list.push(y)
            } else {
                const x = 0
                const y = 0
                points_list.push(x)
                points_list.push(y)
           }
        })

        // draw text result to canvas
        const center_x = tf.tensor(x_list).mean().dataSync()
        const center_y = tf.tensor(y_list).mean().dataSync()
        const ctx = canvas.getContext("2d");

        ctx.font="30px Verdana";
        ctx.fillText(text, center_x+x, center_y+y)
    }
}
