const mongoose = require('mongoose')
const data = new mongoose.Schema({
    positions: {
        type: Array
    }, 
    course: {}
})
module.exports = mongoose.model('data', data)