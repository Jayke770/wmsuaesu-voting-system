const mongoose = require('mongoose')
const election = new mongoose.Schema({
    election_title:{
        type: String
    },
    election_description: {},
    courses: {
        type: Array
    },
    year: {
        type: Array
    },
    positions:{
        type: Array
    }, 
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
    //Pending, Not Started, Pending for deletion
    status:{
        type: String,
    },
    start: {}, 
    end: {}, 
    autoAccept_voters:{
        type: Boolean,
        default: false
    },
    autoAccept_candidates:{
        type: Boolean,
        default: false
    },
    deletion_status: {},
    created:{}
})
module.exports = mongoose.model('elections', election)