const canvas = require('canvas')
const faceapi = require('@vladmandic/face-api')
module.exports = {
    monkeyPatchFaceApiEnv: () => {
        const { Canvas, Image, ImageData } = canvas
        faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
    }
}