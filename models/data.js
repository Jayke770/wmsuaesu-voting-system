const mongoose = require('mongoose')
const data = new mongoose.Schema({
    positions: {
        type: Array
    }, 
    course: {
        type: Array
    }, 
    year: {
        type: Array
    }
})
module.exports = mongoose.model('data', data)