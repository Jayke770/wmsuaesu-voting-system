const tf = require('@tensorflow/tfjs-node')
const canvas = require('canvas')
const faceapi = require('@vladmandic/face-api')
const {monkeyPatchFaceApiEnv} = require('./monkeyPatch')
const path = require('path')
const fs = require('fs-extra')
const MODELS_URL = path.join(__dirname, '/face-models/')
let optionsSSDMobileNet, labeledFaceDescriptors = []
const distanceThreshold = 0.5
const minConfidence = 0.1
monkeyPatchFaceApiEnv()

async function getDescriptors(file) {
    const buffer = fs.readFileSync(file)
    const tensor = tf.node.decodeImage(buffer, 3)
    const faces = await faceapi.detectAllFaces(tensor, optionsSSDMobileNet).withFaceLandmarks().withFaceDescriptors()
    tf.dispose(tensor)
    return faces.map((face) => face.descriptor)
}

async function registerface(student_id, file) {
    const descriptors = await getDescriptors(file)
    for (const descriptor of descriptors) {
        const labeledFaceDescriptor = new faceapi.LabeledFaceDescriptors(student_id, [descriptor])
        labeledFaceDescriptors.push(labeledFaceDescriptor)
    }
}
module.exports = {
    load: async () => {
        let res = false
        try {
            await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_URL)
            await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_URL)
            await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_URL)
            await faceapi.nets.ageGenderNet.loadFromDisk(MODELS_URL)
            await faceapi.nets.faceExpressionNet.loadFromDisk(MODELS_URL)
            optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 1 })
            res = true
        } catch (e) {
            console.log(e)
            res = false
        }
        return res
    }, 
    identifyface: async (student_id, facial, faciallogin) => {
        let matches = [], res = {
            status: false,
            match: null
        }
        try {
            await registerface(student_id, facial)
            const matcher = new faceapi.FaceMatcher(labeledFaceDescriptors, distanceThreshold)
            const descriptors = await getDescriptors(faciallogin)
            for (const descriptor of descriptors) {
                const match = await matcher.findBestMatch(descriptor)
                matches.push(match)
            }
            if(matches.length > 0 ) {
                res.status = true
                res.match = matches
            } else {
                res.status = false
                res.match = matches
            }
        } catch (e) {
            res.status = false
            res.match = matches
        }
        return res
    }
}