const user = require('../models/user')
const admin = require('../models/admin')
const data = require('../models/data')
const election = require('../models/election')
const objectid = require('mongodb').ObjectID
const { v4: uuid } = require('uuid');
const bcrypt = require('bcrypt')
const xs = require('xss')
const moment = require('moment-timezone')
const { createCanvas, loadImage } = require('canvas')
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
    user_data: async (id) => {
        let result
        try {
            await user.find({
                _id: {$eq: xs(id)}
            }, {password: 0, username: 0}).then( (data) => {
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
    //get user id 
    user_id: async (student_id) => {
        let result
        try {
            await user.find({
                student_id: {$eq: xs(student_id)}
            }, {_id: 1}).then( (data) => {
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
    valid_vote: (position, vote) => {
        console.log(vote)
        if(vote.length > 0){
            return "Not"
        } else {
            return "Invalid Vote"
        }
    },
    //get votes 
    count_vote: (position, votes) => {
        let position_count = 0 

        if(votes instanceof Array){
            for(let i = 0; i < votes.length; i++){
                if(JSON.parse(votes[i]).positionID === position.id){
                    position_count += 1
                }
            }
            if(position_count === 0){
                return false
            } else {
                return position_count <= parseInt(position.maxvote)
            }  
        } else {
            return false
        }
    },
    is_course_eligible: async (electionID, voter_course) => {
        let res = false
        await election.find({_id: {$eq: xs(electionID)}}, {courses: 1}).then( (elec) => {
            for(let i = 0; i < elec[0].courses.length; i++){
                if(elec[0].courses[i] === voter_course) {
                    res = true 
                    break
                } 
            }
        }).catch( (e) => {
            res = false
        })
        return res
    },
    is_year_eligible: async (electionID, voter_year) => {
        let res = false
        await election.find({_id: {$eq: xs(electionID)}}, {year: 1}).then( (elec) => {
            for(let i = 0; i < elec[0].year.length; i++){
                if( elec[0].year[i] === voter_year) {
                    res = true 
                    break
                } 
            }
        }).catch( (e) => {
            res = false
        })
        return res
    },
    course: async () => {
        let result
        try {
            await data.find({}, {course: 1}).sort({"course.type": 1}).then( (c) =>{
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
            await data.find({}, {year: 1}).sort({"year.type": 1}).then( (y) =>{
                result =  y.length === 0 ? [] : y[0].year
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
    myposition: async (id) => {
        let res
        try {
            await data.find({}, {positions: 1}).then( (p) =>{
                const pos = p.length === 0 ? [] : p[0].positions
                for(let i = 0; i < pos.length; i++){
                    if(pos[i].id === id){
                        res = pos[i].type 
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
    mypartylist: async (id) => {
        let res
        try {
            await data.find({}, {partylists: 1}).then( (p) =>{
                const pty = p.length === 0 ? [] : p[0].partylists
                for(let i = 0; i < pty.length; i++){
                    if(pty[i].id === id){
                        res = pty[i].type 
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
            await election.find({}, {passcode: 0}).then( async (elec) => {
                if(elec.length !== 0){
                    for(let i = 0; i < elec.length; i++){
                        const e_start = moment(elec[i].start).tz("Asia/Manila").fromNow().search("ago") !== -1 ? true : false
                        const e_end = moment(elec[i].end).tz("Asia/Manila").fromNow().search("ago") !== -1 ? true : false
                        const e_deletion = moment(elec[i].deletion_status).tz("Asia/Manila").fromNow().search("ago") !== -1 ? true : false
                        //if election is not started and it is the time to start
                        if(elec[i].status === "Not Started" && e_start && !e_end){
                            //start election 
                            await election.updateOne({_id: {$eq: xs(elec[i]._id)}}, {$set: {status: "Started"}}).then( async () => {
                                console.log(`Election with ID ${elec[i]._id} has been Started\nElection Title : ${elec[i].election_title}`)
                                res = {electionID: elec[i]._id, status: true, type: "Started"}
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }
                        //if election is not ended and it is the time to end
                        if(elec[i].status === "Started" && e_start && e_end){
                            // end election 
                            await election.updateOne({_id: {$eq: xs(elec[i]._id)}}, {$set: {status: "Ended"}}).then( () => {
                                console.log(`Election with ID ${elec[i]._id} has been Ended\nElection Title : ${elec[i].election_title}`)
                                res = {electionID: elec[i]._id, status: true, type: "Ended"}
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }
                        //if election is pending for deleetion 
                        if(elec[i].status === "Pending for deletion" && e_deletion && e_start && e_end){
                            //delete election 
                            //get all voters student_id 
                            await election.find({ _id: {$eq: xs(elec[i]._id)}}, {voters: 1}).then( async (voters) => {
                                if(voters.length > 0){
                                    for(let i = 0; i < voters.length; i++){
                                        //remove the current election id in the user document 
                                        await user.updateOne({student_id: {$eq: xs(voters[i].student_id)}}, {$pull: {elections: xs(elec[i]._id)}})
                                    }
                                    await election.deleteOne({_id: {$eq: xs(elec[i].id)}}).then( () => { 
                                        //delete this election
                                        console.log(`Election with ID ${elec[i]._id} has been Deleted\nElection Title : ${elec[i].election_title}`)
                                        res = {electionID: elec[i]._id, status: true, type: "Deleted"}
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                } else {
                                    await election.deleteOne({_id: {$eq: xs(elec[i].id)}}).then( () => { 
                                        //delete this election
                                        console.log(`Election with ID ${elec[i]._id} has been Deleted\nElection Title : ${elec[i].election_title}`)
                                        res = {electionID: elec[i]._id, status: true, type: "Deleted"}
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                }
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
            res = {electionID: '', status: false, type: "Error"}
        }
        return res
    },
    //this will check all the users election feild if the election is exists 
    users_election_handler: async () => {
        try {
            await user.find({}, {elections: 1, _id: 1}).then( async (user_elecs) => {
                if(user_elecs.length > 0){
                    for(let i = 0; i < user_elecs.length; i++){
                        if(user_elecs[i].elections.length > 0){
                            for(let j = 0; j < user_elecs[i].elections.length; j++){
                                //then check if this election is currently exists 
                                await election.find({_id: {$eq: xs(user_elecs[i].elections[j])}, "voters.id": {$eq: xs(user_elecs[i]._id.toString())}}, {_id: 1}).then( async (elec) => {
                                    //pull this election id to user election feild 
                                    if(elec.length === 0){
                                        await user.updateOne({_id: {$eq: xs(user_elecs[i]._id)}}, {$pull: {elections: xs(user_elecs[i].elections[j])}})
                                    }
                                }).catch( (e) => {
                                    throw new Error(e)
                                })
                            }
                        }
                    }
                }
            })
        } catch (e) {
            console.log(e)
        }
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
    myprofile: (background, foreground, text) => {
        const canvas = createCanvas(250, 250)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = background
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.font = 'bold 80px Assistant'
        ctx.fillStyle = foreground
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)
        return canvas.toDataURL("image/png")
    }, 
    color: {
        light: () => {
            var letters = 'BCDEF'.split(''), color = '#'
            for (var i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * letters.length)]
            }
            return color
        }, 
        dark: () => {
            let color = "#"
            for (let i = 0; i < 3; i++)
                color += ("0" + Math.floor(Math.random() * Math.pow(16, 2) / 2).toString(16)).slice(-2)
            return color
        }
    }, 
    //notification
    newNotification: async (id, type, data) => {
        let res = false
        try {
            if(xs(type) === "account"){
                await user.updateOne({_id: {$eq: xs(id)}}, {$push: {"notifications.account": data}}).then( (h) => {
                    console.log(h)
                    res = true
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else if(xs(type) === "election") {
                await user.updateOne({_id: {$eq: xs(id)}}, {$push: {"notifications.election": data}}).then( (h) => {
                    console.log(h)
                    res =  true
                }).catch( (e) => {
                    throw new Error(e)
                })
            }
        } catch (e) {
            console.log(e)
            res =  false
        }
        return res
    }, 
    newAdminNotification: async (type, data) => {
        let res = false
        try {
            if(xs(type) === "account"){
                await admin.updateOne({}, {$push: {"notifications.account": data}}).then( (h) => {
                    console.log(h)
                    res = true
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else if(xs(type) === "election") {
                await admin.updateOne({}, {$push: {"notifications.election": data}}).then( (h) => {
                    console.log(h)
                    res =  true
                }).catch( (e) => {
                    throw new Error(e)
                })
            }
        } catch (e) {
            console.log(e)
            res =  false
        }
        return res
    }, 
    sy: async () => {
        let res
        await admin.find({}, {sy: 1}).then( (sy) => {
            res = sy.length > 0 ? sy[0].sy : false
        }).catch( () => {
            res = false
        })
        return res
    }
}