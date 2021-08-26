const mongoose = require('mongoose')
const data = new mongoose.Schema({
    voterId: {
        type: Array
    },
    positions: {
        type: Array
    }, 
    course: {
        type: Array
    }, 
    year: {
        type: Array
    }, 
    partylists: {
        type: Array
    },
})
module.exports = mongoose.model('data', data)