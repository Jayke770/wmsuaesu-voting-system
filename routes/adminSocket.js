const { isadminSocket: admin } = require('./functions')
const adminSocket = async (socket) => {
    if (!admin(socket.handshake.session.user_type)) {
        socket.disconnect()
    }
    //new election partylists added 
    socket.on('new-election-partylist', async (data, res) => {
        const {currentElection} = socket.handshake.session
        console.log(data)
        await socket.broadcast.emit('new-election-partylist', {
            id: currentElection,
            partylist: data
        })
        res({
            sent: true
        })
    })
}
module.exports = adminSocket