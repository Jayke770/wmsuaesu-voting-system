const tf = require('@tensorflow/tfjs-node')
const fs = require('fs-extra')
const faceapi = require('@vladmandic/face-api')
const path = require('path')
const MODELS_URL = path.join(__dirname, '/face-models/')
let optionsSSDMobileNet, labeledFaceDescriptors = []
const distanceThreshold = 0.6
const minConfidence = 0.1
async function getDescriptors(file) {
    const buffer = fs.readFileSync(file)
    const tensor = tf.node.decodeImage(buffer, 3)
    const faces = await faceapi.detectAllFaces(tensor, optionsSSDMobileNet).withFaceLandmarks().withFaceExpressions().withFaceDescriptors()
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
            await faceapi.nets.faceExpressionNet.loadFromDisk(MODELS_URL)
            optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 2 })
            res = true
        } catch (e) {
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
                const match = matcher.findBestMatch(descriptor)
                matches.push(match)
            }
            console.log(matches)
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
        console.log(res)
        return res
    }, 
    checkface: async (facial) => {
        let res = null
        try {
            const buffer = fs.readFileSync(facial)
            const tensor = tf.node.decodeImage(buffer, 3)
            const faces = await faceapi.detectAllFaces(tensor, optionsSSDMobileNet).withFaceLandmarks().withFaceExpressions().withFaceDescriptors()
            tf.dispose(tensor)
            faces.length === 1 ? res = true : res = false
        } catch (e) {
            res = false
        }
        return res
    }
}
