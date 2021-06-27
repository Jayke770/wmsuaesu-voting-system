const mongoose = require('mongoose')
const student_id = new mongoose.Schema({
    student_id: {
        type: String, 
        required: true
    }, 
    course: {
        type: String, 
        required: true
    },
    year: {
        type: String, 
        required: true
    },
    enabled: {
        type: Boolean
    }
})
module.exports = mongoose.model('student-ids', student_id)