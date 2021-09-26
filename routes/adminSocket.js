const { isadminSocket: admin } = require('./functions')
module.exports = async (io, socket) => {
    //namespace 
    const user_nsp = io.of('/users')
    const admin_nsp = io.of('/admin')
    console.log('Admin') 
    
    admin_nsp.on('from-user', (data, res) => {
        console.log(data)
    })
}