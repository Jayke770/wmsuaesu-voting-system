const user = require('../models/user')
const admin = require('../models/admin')
const data = require('../models/data')
const election = require('../models/election')
const objectid = require('mongodb').ObjectID
const { v4: uuid } = require('uuid');
const ftp = require('basic-ftp')
const bcrypt = require('bcrypt')
const xs = require('xss')
const moment = require('moment-timezone')
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
    }, 
    compareHash: async (a, b) => { //(string to compare, the password)
        return await bcrypt.compare(a, b)
    },
    //socket functions
    isadminSocket: async (type) => {
        return type === "admin" ? true : false
    },
    isuserSocket: async (id) => {
        let res = false
        await user.find({_id: {$eq: objectid(xs(id))}}).then( (s) => {
            res = s.length === 0 ? false : true
        }).catch( (e) => {
            res = false
        })
        return res
    }, 
    //user data 
    user_data: async function (id) {
        let result
        try {
            await user.find({
                _id: {$eq: xs(id)}
            }, {messages: 0, hearts: 0, comments: 0, visitors: 0, notifications: 0, password: 0, username: 0}).then( (data) => {
                result = data.length === 0 ? [] : data[0]
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            return false
        }
        //return user data 
        return result
    },
    //using student id
    user_socket_id: async (id) => {
        let res 
        try {
            //get user voter id 
            await user.find({
                student_id: {$eq: xs(id)}
            }, {socket_id: 1}).then( (u) => {
                res = u.length === 0 ? false : u[0].socket_id
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            res = false
        }
        return res
    },
    //elections 
    course: async () => {
        let result
        try {
            await data.find({}, {course: 1}).then( (c) =>{
                result =  c.length === 0 ? [] : c[0].course
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            return []
        }
        //return courses 
        return result
    }, 
    year: async () => {
        let result
        try {
            await data.find({}, {year: 1}).then( (c) =>{
                result =  c.length === 0 ? [] : c[0].year
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            return []
        }
        //return year
        return result
    }, 
    partylists: async () => {
        let result
        try {
            await data.find({}, {partylists: 1}).then( (c) =>{
                result =  c.length === 0 ? [] : c[0].partylists
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            return []
        }
        //return partylists
        return result
    },
    positions: async () => {
        let result
        try {
            await data.find({}, {positions: 1}).then( (c) =>{
                result =  c.length === 0 ? [] : c[0].positions
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            return []
        }
        //return positions
        return result
    }, 
    mycourse: async (id) => {
        let res
        try {
            await data.find({}, {course: 1}).then( (c) =>{
                const course = c.length === 0 ? [] : c[0].course
                for(let i = 0; i < course.length; i++){
                    if(course[i].id === id){
                        res = course[i].type 
                        break
                    }
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            res = false
        }
        return res
    },
    myyear: async (id) => {
        let res
        try {
            await data.find({}, {year: 1}).then( (y) =>{
                const year = y.length === 0 ? [] : y[0].year
                for(let i = 0; i < year.length; i++){
                    if(year[i].id === id){
                        res = year[i].type 
                        break
                    }
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            res = false
        }
        return res
    },
    //update all election status 
    election_handler: async () => {
        let res
        try {
            //get all elections 
            await election.find({}).then( async (elec) => {
                if(elec.length !== 0){
                    for(let i = 0; i < elec.length; i++){
                        const e_start = moment(elec[i].start).tz("Asia/Manila").fromNow().search("ago") !== -1 ? true : false
                        const e_end = moment(elec[i].end).tz("Asia/Manila").fromNow().search("ago") !== -1 ? true : false
                        const e_deletion = moment(elec[i].deletetion_status).tz("Asia/Manila").fromNow().search("minute|moment|seconds|hour") !== -1 ? true : false
                        //if election is not started and it is the time to start
                        if(elec[i].status === "Not Started" && e_start && !e_end){
                            //start election 
                            await election.updateOne({_id: {$eq: objectid(xs(elec[i]._id))}}, {$set: {status: "Started"}}).then( (u) => {
                                console.log(`Election with ID ${elec[i]._id} has been Started\nElection Title : ${elec[i].election_title}`)
                                res = {electionID: elec[i]._id, status: true, type: "Started"}
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }
                        //if election is not ended and it is the time to end
                        if(elec[i].status === "Started" && e_start && e_end){
                            //start election 
                            await election.updateOne({_id: {$eq: objectid(xs(elec[i]._id))}}, {$set: {status: "Ended"}}).then( () => {
                                console.log(`Election with ID ${elec[i]._id} has been Ended\nElection Title : ${elec[i].election_title}`)
                                res = {electionID: elec[i]._id, status: true, type: "Ended"}
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }
                        //if election is pending for deleetion 
                        if(elec[i].status === "Pending for deletion" && e_deletion && e_start && e_end){
                            //delete election 
                            await election.deleteOne({_id: {$eq: objectid(xs(elec[i].id))}}).then( (d) => {
                                console.log(`Election with ID ${elec[i]._id} has been Deleted\nElection Title : ${elec[i].election_title}`)
                                res = {electionID: elec[i]._id, status: true, type: "Deleted"}
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }
                    }
                } else {
                    return false
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            res = {electionID: elec[i]._id, status: false, type: "Error"}
        }
        return res
    },
    //admin socket id 
    updateAdminSocketID: async (id, socket) => {
        let res 
        await admin.updateOne({_id: {$eq: xs(id)}}, {$set: {socket_id: xs(socket)}}).then( (a) => {
            console.log(e)
            res = true
        }).catch( (e) => {
            res = false
        })
        return res
    },
}