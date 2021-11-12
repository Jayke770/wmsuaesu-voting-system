const mongoose = require('mongoose')
const conversation = new mongoose.Schema({
    userID: {
        type: String
    }, 
    recipient_userID: {
        type: String
    }, 
    name: {
        type: String
    },
    messages: {
        type: Array
    }
})
module.exports = mongoose.model('comversations', conversation)