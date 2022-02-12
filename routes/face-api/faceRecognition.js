const tf = require('@tensorflow/tfjs-node')
const fs = require('fs-extra')
const faceapi = require('@vladmandic/face-api')
const path = require('path')
const MODELS_URL = path.join(__dirname, '/face-models/')
const users = require('../../models/user')
const jimp = require('jimp')
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
    const descriptors = await getDescriptors(`${process.cwd()}/${file}`)
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
    }, 
    checkface: async (facial) => {
        let res = false, matches = []
        try {
            const buffer = fs.readFileSync(facial)
            const tensor = tf.node.decodeImage(buffer, 3)
            const faces = await faceapi.detectAllFaces(tensor, optionsSSDMobileNet).withFaceLandmarks().withFaceExpressions().withFaceDescriptors()
            tf.dispose(tensor)
            if(faces.length === 1){
                //check all users faces 
                await users.find({}, {facial: 1, _id: 0, student_id: 1}).then( async (userFacial) => {
                    if(userFacial.length > 0){
                        for(let i = 0; i < userFacial.length; i++){
                            if(userFacial[i].facial.image){
                                //convert base64 to image
                                const buffer = Buffer.from(userFacial[i].facial.image, "base64")
                                jimp.read(buffer, (err, result) => {
                                    if (err) throw new Error(err)
                                    result.quality(100).write(`uploads/check-face/${userFacial[i].student_id}.jpg`)   
                                })
                                await registerface(userFacial[i].student_id, `uploads/check-face/${userFacial[i].student_id}.jpg`)
                            }
                        }
                        const matcher = new faceapi.FaceMatcher(labeledFaceDescriptors, distanceThreshold)
                        const descriptors = await getDescriptors(facial)
                        for (const descriptor of descriptors) {
                            const match = matcher.findBestMatch(descriptor)
                            matches.push(match)
                        }
                        matches.length === 1 && matches[0]._label === 'unknown' ? res = true : false
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            }
        } catch (e) {
            res = false
        }
        return res
    }
}
