const mongoose = require('mongoose')
const admin_acc = new mongoose.Schema({
    socket_id: {
        type: String
    },
    notifications: {
        type: Array,
    }, 
    messages: {
        type: Array,
    },
    type: {
        type: String
    }
})
module.exports = mongoose.model('admin', admin_acc)