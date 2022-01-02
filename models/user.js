const mongoose = require('mongoose') 
const user =  new mongoose.Schema({
    student_id: {
        type: String, 
        required: true
    },
    firstname: {
        type: String, 
        required: true
    },
    middlename: {
        type: String, 
        required: true
    },
    lastname: {
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
    username: {
        type: String
    },
    password: {
        type: String
    }, 
    socket_id: {
        type: String,
    },
    messages:{
        type: Array,
    },
    fans:{
        type: Array,
    },
    comments:{
        type: Array,
    },
    bio:{
        type: String,
    },
    visitors:{
        type: Array,
    },
    last_seen: {
        type: String,
    },
    sy: {
        type: String,
    },
    notifications:{
        account: {
            type: Array,
        }, 
        election: {
            type: Array,
        },
        system: {
            type: Array,
        }
    },
    elections: {
        type: Array,
    },
    devices: {
        type: Array,
    },
    email: {
        id: {
            type: String
        }, 
        email: {
            type: String
        }, 
        status: {
            type: String
        }, 
        added: {
            type: String
        }
    },
    photo: {
        cover: {}, 
        profile: {}
    },
    facial: {
        status: {
            type: Boolean
        }, 
        image: {
            type: String
        }
    },
    created: {
        type: Date, 
        default: Date.now()
    }
})
module.exports = mongoose.model('users', user)
