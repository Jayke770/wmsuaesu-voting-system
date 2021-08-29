const user = require('../models/user')
const admin = require('../models/admin')
const objectid = require('mongodb').ObjectID
const { v4: uuid } = require('uuid');
const ftp = require('basic-ftp')
const bcrypt = require('bcrypt')
module.exports = {
    toUppercase: function (val) {
        const str = val.charAt(0).toUpperCase() + val.slice(1)
        return str
    },
    chat: async (req, res, next) => {
        const userid = req.session.myid
        var chat_id
        if (req.session.my_ka_chat) {
            chat_id = req.session.my_ka_chat
            if (chat_id == 'admin') {
                req.session.my_ka_chat = 'admin' // userid of bot
                const msg = {
                    name: 'Election Bot',
                    userid: userid,
                    my_ka_chatid: 'admin'
                }
                req.session.msg = msg
                return next()
            }
            //check if the is exist in messages feild
            await user.find({ _id: userid, "messages.id": chat_id }, { messages: 1 }, (err, found) => {
                if (!err && found.length != 0) {
                    if (found.length != 0) {
                        user.find({ _id: chat_id }, { socket_id: 1, firstname: 1, middlename: 1, lastname: 1 }, (err, data_msg) => {
                            if (err) {
                                return res.send({
                                    ischat: false,
                                    msg: 'Internal Error'
                                })
                            }
                            else {
                                const msg = {
                                    name: data_msg[0].firstname,
                                    socket: data_msg[0].socket_id,
                                    userid: userid,
                                    my_ka_chatid: chat_id
                                }
                                req.session.msg = msg
                                return next()
                            }
                        })
                    }
                    else {
                        return next()
                    }
                }
                else {
                    delete req.session.msg
                    delete req.session.my_ka_chat
                    return next()
                }
            })
        }
        else {
            return next()
        }
    },
    bot: () => {
        return bot = {
            id: 'admin',
            fname: 'Election Bot',
            mname: '',
            lname: '',
            created: Date.now(),
            chats: []
        }
    },
    new_msg: (id, fname, mname, lname) => {
        return bot = {
            id: objectid(id),
            fname: fname,
            mname: mname,
            lname: lname,
            created: Date.now(),
            chats: []
        }
    },
    new_nty: (id, nm, election, data, type) => {
        return new_nty = {
            nty_id: uuid(),
            userid: id,
            name: nm,
            election: election,
            data: data,
            type: type,
            read: 0,
            time: Date.now()
        }
    }, 
    ftp: async () => {
        const client = new ftp.Client()
        try {
            await client.access({
                host: process.env.ftp_host,
                port: process.env.ftp_port,
                user: process.env.ftp_username,
                password: process.env.ftp_password
            })
            return true
        } catch(e){
            return false
        }
    }, 
    hash: async (data, n) => {
        return await bcrypt.hash(data, n)
    }
}