const { isadminSocket: admin } = require('./functions')
const adminSocket = async (socket) => {
    if (!admin(socket.handshake.session.user_type)) {
        socket.disconnect()
    }
}
module.exports = adminSocket