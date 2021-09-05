const { isadminSocket: admin } = require('./functions')
const adminSocket = async (socket) => {
    if (!admin(socket.handshake.session.user_type)) {
        socket.disconnect()
    }
    console.log("Admin Connected", socket.id)
    socket.on("disconnect", async () => {
        console.log("Admin Disconnected")
    })
    socket.on("test", async (data, res) =>{
        console.log(socket.id, data) 
        res('fassaffs')
    })
}
module.exports = adminSocket