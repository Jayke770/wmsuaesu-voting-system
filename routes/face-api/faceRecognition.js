require('@tensorflow/tfjs-node')
const canvas = require('canvas')
const faceapi = require('@vladmandic/face-api')
const {monkeyPatchFaceApiEnv} = require('./monkeyPatch')
const path = require('path')
const fs = require('fs-extra')
const MODELS_URL = path.join(__dirname, '/face-models/')
monkeyPatchFaceApiEnv()
module.exports = {
    load: async () => {
        let res = false
        try {
            await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL)
            await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL)
            await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_URL)
            await faceapi.nets.ageGenderNet.loadFromDisk(MODELS_URL)
            await faceapi.nets.faceExpressionNet.loadFromDisk(MODELS_URL)
            res = true
        } catch (e) {
            console.log(e)
            res = false
        }
        return res
    }, 
    detectfaces: async (student_id, file) => {
        let descriptions = [], error = false, res = {
            status: null,
            descriptions: null, 
            faceData: null
        }
        try {
            for(let i = 0; i < file.length; i++){
                const image = await canvas.loadImage(file[i].path) 
                const detections = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor()
                descriptions.push(detections.descriptor) 
            }
        } catch (e) {
            console.log(e) 
            error = true
        }
        if(!error){
            res.status = true
            res.descriptions = new faceapi.LabeledFaceDescriptors(student_id, descriptions) 
            return res
        } else {
            res.status = false
            return res
        }
    }
}