const mongoose = require('mongoose')
const election = new mongoose.Schema({
    election_title:{
        type: String, 
        required: true
    },
    election_description: {},
    courses: {
        type: Array, 
        required: true
    },
    positions:{}, 
    candidates:{
        type: Array
    },
    partylist:{
        type: Array, 
        required: true
    },
    voters:{
        type: Array,
    },
    passcode: {
        type: String,
        required: true
    },
    status:{
        type: String,
    },
    start: {}, 
    end: {}, 
    created:{
        type: Date, 
        default: Date.now()
    }
})
module.exports = mongoose.model('elections', election)