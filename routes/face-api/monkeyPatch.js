const canvas = require('canvas')
const faceapi = require('@vladmandic/face-api')
const fetch = require('node-fetch')
module.exports = {
    monkeyPatchFaceApiEnv: () => {
        const { Canvas, Image, ImageData } = canvas
        faceapi.env.monkeyPatch({ Canvas, Image, ImageData })
        faceapi.env.monkeyPatch({ fetch: fetch })
    }
}