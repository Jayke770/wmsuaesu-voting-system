const mongoose = require('mongoose')
const conversation = new mongoose.Schema({
    userIDs: {
        type: Array,
    },
    messages: {
        type: Array
    }, 
    created: {}
})
module.exports = mongoose.model('comversations', conversation)