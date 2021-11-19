const mongoose = require('mongoose')
const admin_acc = new mongoose.Schema({
    socket_id: {
        type: String
    },
    notifications: {
        election: {
            type: Array,
        }, 
        account: {
            type: Array,
        }, 
        system: {
            type: Array,
        }
    }, 
    messages: {
        type: Array,
    },
    sy: {},
    type: {
        type: String
    }
})
module.exports = mongoose.model('admin', admin_acc)