const { isuserSocket} = require('./functions')
module.exports = async (io, socket) => {
    //namespace 
    const user_nsp = io.of('/users')
    const admin_nsp = io.of('/admin')
    console.log('User')
    user_nsp.to(socket.id).emit('test2', {data: 'fsaf'})
    admin_nsp.emit('from-user', {data: 'fsaf'})
}