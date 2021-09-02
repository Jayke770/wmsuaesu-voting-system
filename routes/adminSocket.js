const { isadminSocket: admin } = require('./functions')
const data = require('../models/data')
const election = require('../models/election')
const xs = require('xss')
const adminSocket = async (socket) => {
    if (!admin(socket.handshake.session.myid, socket.handshake.session.user_type)) {
        socket.disconnect()
    }
}
module.exports = adminSocket