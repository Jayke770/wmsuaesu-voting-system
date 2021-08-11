if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const xs = require('xss')
const ejs = require('ejs')
const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const user = require('../models/user')
const id_db = require('../models/student-id')
const admin = require('../models/admin')
const elections = require('../models/election')
const { authenticated, isadmin, isloggedin, take_photo, get_face } = require('./auth')
const { toUppercase, chat, bot, new_msg, new_nty } = require('./functions')
const election = require('../models/election')
const { v4: uuidv4 } = require('uuid')
const objectid = require('mongodb').ObjectID
const nl2br = require("nl2br")
const img2base64 = require('image-to-base64')
const path = require('path')
const fs = require('fs-extra')
var base64ToImage = require('base64-to-image')
const ftp = require('basic-ftp')
//get
//face recognination 
router.get('/security', async (req, res) => {
    // img2base64(`${process.cwd()}/images/Sharine/1.jpg`).then((data) => {
    //     const ext = path.extname(`${process.cwd()}/images/Sharine/1.jpg`);
    //     const img = `data:image/${ext.split('.').pop()};base64,${data}`

    // })
    res.render('security')
})
router.get('/register_face', take_photo, async (req, res) => {
    res.render('register_face')
})
//register face
router.post('/register-face', take_photo, async (req, res, next) => {
    const image = req.body.image
    const id = req.session.myid.toString()
    var face_reg = false
    //check if the user is already registered his/her face before, this will happen if the user try to visit this url, or the user try to trick the system 
    await user.find({ _id: id }, { face: 1 }, (err, is_face_reg) => {
        if (err) {
            return next()
        }
        if (!err && is_face_reg[0].face) {
            face_reg = true
        }
    })
    if (!face_reg) {
        //create dir temporary dir 
        fs.mkdir(`./images/${id}/`, async (err) => {
            if (err) {
                return res.send({
                    reg: false,
                    msg: "Can't upload face"
                })
            }
            else {
                //temporarily save to disk 
                var path = `${process.cwd()}/images/${id}/`
                var optionalObj = { 'fileName': id, 'type': 'png' }
                if (await base64ToImage(image, path, optionalObj)) {
                    //upload to ftp 
                    const client = new ftp.Client()
                    try {
                        await client.access({
                            host: process.env.ftp_host,
                            port: process.env.ftp_port,
                            user: process.env.ftp_username,
                            password: process.env.ftp_password
                        })
                        await client.ensureDir(`/htdocs/files/${id}`)
                        await client.clearWorkingDir()
                        await client.uploadFromDir(`./images/${id}`)
                    }
                    catch (err) {
                        console.log(err)
                        return res.send({
                            reg: false,
                            msg: "Internal Error",
                            line: 78
                        })
                    }
                    client.close()
                    //delete dir in node server 
                    fs.remove(`./images/${id}/`, async (err) => {
                        if (!err) {
                            //set user face feild to true 
                            await user.updateOne({ _id: id }, { $set: { face: true } }, (err, done) => {
                                if (!err) {
                                    delete req.session.take_photo
                                    return res.send({
                                        reg: true,
                                        msg: "Face Registered"
                                    })
                                }
                                return next()
                            })
                        }
                    })
                }
                else {
                    return res.send({
                        reg: false,
                        msg: "Internal Error",
                        line: 97
                    })
                }
            }
        })
    }
})
router.get('/', authenticated, get_face, async (req, res) => {
    res.render('auth')
})
router.get('/control', isadmin, async (req, res) => {
    //get all elections 
    await election.find({}, (err, elec) => {
        user.find({}, { firstname: 1, middlename: 1, lastname: 1, socket_id: 1, _id: 1 }, (err, users) => {
            res.render('control/home', { elections: elec, users: users })
        })
    })
})
router.get('/home', isloggedin, chat, get_face, async (req, res) => {
    //if user logged data is save 
    const user_id = req.session.myid
    var chatting = false
    var msg
    if (req.session.my_ka_chat && req.session.msg) {
        chatting = true
        msg = req.session.msg
    }
    //check if the user joined an election before
    await election.find({}, { positions: 1, partylist: 1, courses: 1, voters: 1, _id: 1, election_title: 1, status: 1 }, (err, e_find) => {
        //search userid of user if exist
        var e_join_before = false //to determine if the joined election before
        var e_data
        for (var i = 0; i < e_find.length; i++) {
            for (var u in e_find[i].voters) {
                if (e_find[i].voters[u].id.toString() == user_id.toString()) {
                    req.session.election_id = e_find[i]._id
                    req.session.join_election = true
                    e_join_before = true
                    e_data = {
                        e_title: e_find[i].election_title,
                        e_status: e_find[i].status,
                        crs: e_find[i].courses,
                        prty: e_find[i].partylist,
                        ps: e_find[i].positions
                    }
                    break
                }
            }
        }
        //condition
        if (e_join_before) {
            //get user data
            user.find({ _id: user_id }, { socket_id: 0, username: 0, password: 0, _v: 0 }, { limit: 1 }, (err, result) => {
                if (result.length == 1) {
                    res.render('index', { election_data: e_data, join_election: true, data: result[0], chat: chatting, msg: msg })
                } else {
                    res.redirect('/logout')
                }
            })
        }
        else {
            //get user data
            user.find({ _id: user_id }, { socket_id: 0, username: 0, password: 0, _v: 0 }, { limit: 1 }, (err, result) => {
                if (result.length == 1) {
                    res.render('index', { join_election: false, data: result[0], chat: chatting, msg: msg })
                } else {
                    res.redirect('/logout')
                }
            })
        }
    })
})
router.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/')
})
//profile
router.get('/home/profile/', isloggedin, async (req, res) => {
    res.send("Route Is Not Available Right Now")
    // var { id, notification_id, read } = req.query
    // var user_id = req.session.myid

    // //check if query is from notifications 
    // if (typeof id != "undefined" && typeof notification_id != "undefined" && typeof read != "undefined") {
    //     //update notification 
    //     if (read == 0) {
    //         await user.updateOne({ _id: user_id, "notifications.nty_id": notification_id }, { $set: { "notifications.$.read": 1 } })
    //     }
    // }

    // //means the user is visited other profile or his/her profile
    // if (typeof id != "undefined") {
    //     //check if the user visited his/her own profle
    //     if (user_id == id) {
    //         //check if the id is exist in database
    //         await user.find({ _id: id }, { username: 0, password: 0, socket_id: 0, student_id: 0 }, (err, is_userfound) => {
    //             if (err) {
    //                 //todo send an html
    //                 res.status(404).render('Error/index')
    //             }
    //             else {
    //                 if (is_userfound.length != 0) {
    //                     req.session.visited_id = is_userfound[0]._id //can be used to comment profile
    //                     return res.render('profile', { profile: true, data: is_userfound })
    //                 }
    //                 else {
    //                     //todo send an not found html
    //                     res.status(404).render('Error/index')
    //                 }
    //             }
    //         })
    //     }
    //     //means the user is visited other profile
    //     if (user_id != id) {
    //         //if not the same id means the user is try to visit another profile
    //         await user.find({ _id: id }, { username: 0, password: 0, socket_id: 0, student_id: 0, notifications: 0 }, (err, is_userfound) => {
    //             if (err) {
    //                 //todo send an html
    //                 res.status(404).render('Error/index')
    //             }
    //             else {
    //                 if (is_userfound.length != 0) {
    //                     //add the userid of visitor to user he/she currently visit
    //                     user.updateOne({ _id: id }, { $pull: { visitors: user_id } }, (err, ok) => {
    //                         //remove first the user id if exist
    //                         if (!err) {
    //                             user.updateOne({ _id: id }, { $push: { visitors: user_id } }, (err, ok2) => {
    //                                 //remove first the user id if exist
    //                                 if (!err) {
    //                                     //get the notifications of the user who visited  other profile 
    //                                     user.find({ _id: user_id }, { notifications: 1 }, (err, nty) => {
    //                                         if (!err) {
    //                                             req.session.visited_id = is_userfound[0]._id
    //                                             return res.render('profile', { profile: false, data: is_userfound, nty: nty[0].notifications })
    //                                         }
    //                                     })
    //                                 }
    //                             })
    //                         }
    //                     })
    //                 }
    //                 else {
    //                     //todo send an not found html
    //                     res.status(404).render('Error/index')
    //                 }
    //             }
    //         })
    //     }
    // }
})
//post
router.post('/verify', async (req, res) => {
    const { id } = req.body
    if (id != "") {
        await id_db.find({ student_id: id }, function (err, doc) {
            if (doc.length == 1) {
                //check if the id is already enabled 
                if (!doc[0].enabled) {
                    return res.send({
                        isvalid: true,
                        msg: "Student ID Is Valid",
                        id: doc[0].student_id
                    })
                }
                if (doc[0].enabled) {
                    return res.send({
                        isvalid: false,
                        msg: "Student ID Is Already Registered"
                    })
                }
            }
            return res.send({
                isvalid: null,
                msg: "Cannot Find Student ID"
            })
        })
    }
})
router.post('/login', async (req, res) => {
    const { auth_usr, auth_pass } = req.body
    if (auth_usr.trim() != "" && auth_pass.trim() != "") {
        if (auth_usr == process.env.admin_username && auth_pass == process.env.admin_password) {
            //session
            await admin.find({}, (err, doc) => {
                if (doc.length == 0) {
                    admin.create({
                        socket_id: "Waiting For Socket",
                        type: "admin"
                    }, (err, doc) => {
                        req.session.myid = doc._id
                        req.session.islogin = "okay"
                        req.session.user_type = doc.type
                        return res.send({
                            islogin: true,
                            msg: "Welcome Admin"
                        })
                    })
                }
                else {
                    req.session.myid = doc[0]._id
                    req.session.islogin = "okay"
                    req.session.user_type = doc[0].type
                    return res.send({
                        islogin: true,
                        msg: "Welcome Admin"
                    })
                }
            })
        } else {
            //user is not admin
            //check user in database
            user.find({ username: auth_usr }, async (err, result) => {
                if (result.length == 0) {
                    return res.send({
                        islogin: false,
                        msg: "Account Not Found"
                    })
                }
                for (var i = 0; i < result.length; i++) {
                    const match_password = await bcrypt.compare(auth_pass, result[i].password)
                    if (match_password) {
                        //get all the basic data except the username, password, student_id, _id, and socket_id
                        const data = {
                            fname: result[i].firstname,
                            mname: result[i].middlename,
                            lname: result[i].lastname,
                            course: result[i].course,
                            year: result[i].year,
                            type: result[i].type
                        }

                        //session
                        req.session.islogin = true // determine if logged
                        req.session.user_type = result[i].type // user type
                        req.session.myid = result[i]._id // user id
                        req.session.data = data //all user data

                        return res.send({
                            islogin: true,
                            msg: "Welcome " + result[i].firstname
                        })
                    } else {
                        return res.send({
                            islogin: false,
                            msg: "Incorrect Password!"
                        })
                    }
                }
            })
        }
    }
})
router.post('/register', async (req, res) => {
    const { student_id, fname, mname, lname, course, yr, type, usr, pass } = req.body
    const hash_password = await bcrypt.hash(pass, 10)
    //check if all feilds is not empty
    if (fname != "" && mname != "" && lname != "" && course != "" && yr != "" && type != "") {
        //check student id in student_ids collection if not enabled or not deleted
        await id_db.find({ student_id: student_id, course: course, year: yr, enabled: false }, (err, okay) => {
            if (okay.length == 1) {
                //check if the username is valid
                user.find({ username: usr }, (err, found) => {
                    if (found.length != 0) {
                        return res.send({
                            islogin: false,
                            msg: "Username is already taken"
                        })
                    }
                    else {
                        //check student id
                        user.find({ student_id: student_id }, (err, result) => {
                            if (err) {
                                return res.send({
                                    islogin: false,
                                    msg: "Internal Error!",
                                    line: 79
                                })
                            }
                            if (result.length == 0) {
                                //if the data sent to server is not  the same is not match any data inside the database
                                user.create({
                                    student_id: student_id,
                                    firstname: toUppercase(fname),
                                    middlename: toUppercase(mname),
                                    lastname: toUppercase(lname),
                                    course: course,
                                    year: yr,
                                    type: type,
                                    socket_id: 'Waiting For Student',
                                    username: usr,
                                    password: hash_password
                                }, (err, doc) => {
                                    if (err) {
                                        return res.send({
                                            islogin: false,
                                            msg: "Failed To Register",
                                            line: 84
                                        })
                                    }

                                    //update student-ids and set the current id to enabled = true
                                    id_db.updateOne({ student_id: student_id }, { $set: { enabled: true } }, (err, status) => {
                                        if (err) {
                                            return res.send({
                                                islogin: false,
                                                msg: "Internal Error",
                                                line: 146
                                            })
                                        }
                                    })
                                    //get all the basic data except the username, password, student_id, _id, and socket_id
                                    const data = {
                                        fname: fname,
                                        mname: mname,
                                        lname: lname,
                                        course: course,
                                        year: yr,
                                        type: type
                                    }

                                    //sessions
                                    req.session.myid = doc._id //session for student
                                    req.session.islogin = true // to determine that user is now logged in
                                    req.session.user_type = type //to determine the user type
                                    req.session.data = data //all user data

                                    //add election bot to user messages feild
                                    user.updateOne({ _id: doc._id }, { $push: { messages: bot() } }, (err, ok) => {
                                        if (!err) {
                                            req.session.take_photo = true //session for taking picture
                                            return res.send({
                                                islogin: true,
                                                msg: "Welcome " + toUppercase(fname)
                                            })
                                        }
                                    })
                                })
                            }
                            else {
                                // means the data sent to server is match the data inside the database
                                return res.send({
                                    islogin: false,
                                    msg: "Student ID Is Already Registered"
                                })
                            }
                        })
                    }
                })
            }
            //if data not match
            if (okay.length == 0) {
                return res.send({
                    islogin: false,
                    msg: "Check your Course & Year"
                })
            }
        })
    }
    else {
        return res.send({
            islogin: false,
            msg: 'All Feilds Is Required'
        })
    }
})
//join election
router.post('/join-election', isloggedin, async (req, res) => {
    const { code } = req.body
    const f_code = xs(code)
    await election.find({ passcode: f_code }, { passcode: 1, voters: 1 }, (err, elec_res) => {
        //if election if found
        if (elec_res.length != 0) {
            const election_data = elec_res[0]
            if (election_data.voters.length != 0) {
                var isjoined = false
                //check if the user id already joined
                for (var i = 0; i < election_data.voters.length; i++) {
                    if (req.session.myid.toString() == election_data.voters[i].id.toString()) {
                        //if the user already joined before
                        isjoined = true
                        break
                    }
                }
                if (isjoined) {
                    //send response
                    req.session.election_id = elec_res[0]._id
                    req.session.join_election = true
                    return res.send({
                        isvalid: true,
                        joined_before: true
                    })
                }
                else {
                    //if voters array is not empty but the user is not joined
                    const new_voter = { id: req.session.myid, joined: Date.now() }
                    election.updateOne({ _id: elec_res[0]._id }, { $push: { voters: new_voter } }, (err, up) => {
                        if (err) {
                            return res.send({
                                isvalid: false,
                            })
                        }
                        else {
                            //send response 
                            req.session.election_id = elec_res[0]._id
                            req.session.join_election = true
                            return res.send({
                                isvalid: true,
                                id: req.session.election_id,
                                joined_before: false
                            })
                        }
                    })
                }
            }
            else {
                //if voters is empty
                const new_voter = { id: req.session.myid, joined: Date.now() }
                election.updateOne({ _id: elec_res[0]._id }, { $push: { voters: new_voter } }, (err, up) => {
                    if (up.nModified == 1) {
                        //send response
                        req.session.election_id = elec_res[0]._id
                        req.session.join_election = true
                        return res.send({
                            isvalid: true
                        })
                    }
                })
            }
        }
        else {
            return res.send({
                isvalid: false
            })
        }
    })
})
//leave election
router.post('/leave-election', isloggedin, async (req, res) => {
    const e_id = req.session.election_id
    const user_id = req.session.myid

    //check if user is exists in the db
    await election.find({ _id: e_id }, { voters: 1 }, (err, find) => {
        var isfind = false
        if (err) {
            return res.send({
                isleave: false,
                line: 318
            })
        }
        else {
            //check if voters array is not empty 
            if (find.length != 0) {
                for (var i = 0; i < find[0].voters.length; i++) {
                    if (find[0].voters[i].id.toString() == user_id.toString()) {
                        isfind = true
                        break
                    }
                }
                //if user found in db 
                if (isfind) {
                    //remove the user from drp_btn
                    election.updateOne({ _id: e_id }, { $pull: { voters: { id: user_id } } }, (err, del) => {
                        if (err) {
                            return res.send({
                                isleave: false,
                                line: 382
                            })
                        }
                        else {
                            delete req.session.election_id
                            req.session.join_election = false
                            return res.send({
                                isleave: true
                            })
                        }
                    })
                }
            }
            else {
                return res.send({
                    isleave: null,
                    line: 465
                })
            }
        }
    })
})
//election info
router.post('/election-info', isloggedin, async (req, res) => {
    const e_id = req.session.election_id
    const userid = req.session.myid
    if (e_id) {
        await election.find({ _id: e_id }, { courses: 1, partylist: 1, positions: 1 }, (err, e_find) => {
            //get user course 
            if (e_find.length != 0) {
                user.find({ _id: userid }, { course: 1 }, (err, user) => {
                    return res.render('election/file_candidacy', {
                        user_crs: user[0].course,
                        positions: e_find[0].positions,
                        courses: e_find[0].courses,
                        partylist: e_find[0].partylist
                    })
                })
            }
        })
    }
})
//file for candidancy
router.post('/file-candidacy', isloggedin, async (req, res) => {
    var { pos, pty, crs, platform } = req.body
    const e_id = req.session.election_id
    const user_id = req.session.myid
    //escape html elements
    pos = xs(pos, {
        whiteList: [],
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
    })
    pty = xs(pty, {
        whiteList: [],
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
    })
    crs = xs(crs, {
        whiteList: [],
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
    })
    platform = xs(platform, {
        whiteList: [],
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
    })
    if (e_id) {
        //if not empty
        if (pos && pty && crs && platform) {
            //check the user is already filed as a candidate before
            await election.find({ _id: e_id }, { candidates: 1 }, (err, find) => {
                if (err) {
                    return res.send({
                        iscreated: false,
                        msg: 'Cant Find Election'
                    })
                }
                else {
                    var isfound = false
                    for (var i = 0; i < find.length; i++) {
                        for (var ca in find[i].candidates) {
                            if (find[i].candidates[ca].candidate.userid.toString() == user_id.toString()) {
                                isfound = true
                                break
                            }
                        }
                    }

                    //if user files already
                    if (isfound) {
                        return res.send({
                            iscreated: false,
                            msg: 'You are already a candidate'
                        })
                    }
                    else {
                        //update candidate feild
                        const new_pos = {
                            candidate: {
                                partylist: pty,
                                position: pos,
                                userid: user_id,
                                partylist: pty,
                                course: crs,
                                platform: platform,
                                hearts: [], //for hearts
                                comments: [] //for comments
                            }
                        }
                        election.updateOne({ _id: e_id }, { $push: { candidates: new_pos } }, (err, created) => {
                            if (err) {
                                return res.send({
                                    iscreated: false,
                                    msg: 'Internal Error'
                                })
                            }
                            else {
                                //if successfully filed
                                return res.send({
                                    iscreated: true,
                                    msg: 'Successfully Filed'
                                })
                            }
                        })
                    }
                }
            })
        }
        else {
            return res.send({
                iscreated: false,
                msg: 'Some Feilds is empty'
            })
        }
    }
    else {
        return res.send({
            iscreated: false,
            msg: 'Invalid Election'
        })
    }
})
//get all candidates
router.post('/candidates', isloggedin, async (req, res) => {
    const e_id = req.session.election_id
    const user_id = req.session.myid

    //get all candidates using the election id where is joined
    await election.find({ _id: e_id }, { candidates: 1, partylist: 1, positions: 1 }, (err, result) => {
        if (err) {
            //if theres an error
            return res.send("")
        }
        else {
            if (result.length != 0) {
                //if election is found
                return res.render('election/candidates', { data: result })

            }
            else {
                //if election id not found
                return res.send("")
            }
        }
    })
})
//candidates fullname
router.post('/ca-fullname', isloggedin, async (req, res) => {
    var { ca_id } = req.body
    ca_id = xs(ca_id, {
        whiteList: [],
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
    })

    //get candidates fullname
    await user.find({ _id: ca_id }, { firstname: 1, middlename: 1, lastname: 1 }, (err, res_fl_name) => {
        if (err) {
            return res.send({
                isvalid: false,
                msg: "Internal Error"
            })
        }
        else {
            //if found
            if (res_fl_name.length != 0) {
                return res.send({
                    isvalid: true,
                    data: res_fl_name
                })
            }
            else {
                return res.send({
                    isvalid: false,
                    msg: "Some Candidates Not Found"
                })
            }
        }
    })
})
//profile comment
router.post('/profile-comment', isloggedin, async (req, res) => {
    var { cmt } = req.body
    const user_id = req.session.myid
    const visited_id = req.session.visited_id
    //search if user visited id is exist 
    await user.find({ _id: visited_id }, { firstname: 1, middlename: 1, lastname: 1 }, (err, isfound) => {
        user.find({ _id: user_id }, { firstname: 1, middlename: 1, lastname: 1 }, (err, is_found_name) => {
            if (isfound.length == 1) {
                //add comment to user data
                const comment_data = {
                    cmt_id: uuidv4(),
                    userid: user_id,
                    name: is_found_name[0].firstname + ' ' + is_found_name[0].middlename + ' ' + is_found_name[0].lastname,
                    comment: cmt,
                    time: Date.now()
                }
                user.updateOne({ _id: visited_id }, { $push: { comments: comment_data } }, (err, is_cmt) => {
                    if (err) {
                        return res.send({
                            send: false
                        })
                    }
                    else {
                        return res.send({
                            send: true,
                            msg: cmt
                        })
                    }
                })
            }
            else {
                //user nor found
                return res.send({
                    send: false
                })
            }
        })
    })
})
//add bio 
router.post('/change-bio', isloggedin, async (req, res) => {
    const { bio } = req.body
    const userid = req.session.myid
    if (bio != "") {
        await user.findByIdAndUpdate({ _id: userid }, { $set: { bio: nl2br(bio) } }, (err, bio_up) => {
            if (err) {
                return res.send({
                    ok: false,
                    msg: "Internal Error"
                })
            }
            if (!err) {
                if (bio_up.length != 0) {
                    return res.send({
                        ok: true,
                        msg: 'Bio Saved!'
                    })
                }
                else {
                    return res.send({
                        ok: false,
                        msg: "I can't find you"
                    })
                }
            }
        })
    }
    else {

    }
})
//message search user 
router.post('/search-user', isloggedin, async (req, res) => {
    var { data } = req.body
    var invalid = /[°"§%()\[\]{}=\\?´`'#<>|,;.:+_-]+/g
    const userid = req.session.myid
    //check if not empty 
    if (data) {
        await user.aggregate([
            {
                $project: {
                    "fullname": {
                        $concat: [
                            "$firstname", " ", "$middlename", " ", "$lastname"
                        ]
                    },
                    socket_id: 1
                }
            },
            { $match: { fullname: new RegExp('^' + data.replace(invalid, ""), "i") } },
        ], (err, search) => {
            if (!err) {
                res.render('messages/_user_message_search', { search, data, userid: userid })
            }
        })
    }
})
//chat user 
router.post('/chat-user', isloggedin, async (req, res) => {
    var { data } = req.body
    const userid = req.session.myid
    //check if the user want to chat with election bot 
    if (xs(data) == 'admin') {
        //check if the user message the bot before 
        await admin.find({ "messages.id": objectid(userid) }, { messages: 1 }, (err, is_bot_chat) => {
            if (!err) {
                if (is_bot_chat.length == 0) {
                    //if the user did not chat the bot before 
                    user.find({ _id: userid }, { firstname: 1, middlename: 1, lastname: 1 }, (err, name) => {
                        if (!err) {
                            //save user info to admin messages 
                            const msg = new_msg(userid, name[0].firstname, name[0].middlename, name[0].lastname)
                            admin.updateOne({ $push: { messages: msg } }, (err, ok) => {
                                if (!err) {
                                    req.session.my_ka_chat = 'admin' // userid of bot
                                    const msg = {
                                        name: 'Election Bot',
                                        userid: userid,
                                        my_ka_chatid: 'admin'
                                    }
                                    return res.render('messages/_float_messenger', { msg })
                                }
                            })
                        }
                    })
                }
                else {
                    req.session.my_ka_chat = 'admin' // userid of bot
                    const msg = {
                        name: 'Election Bot',
                        userid: userid,
                        my_ka_chatid: 'admin'
                    }
                    return res.render('messages/_float_messenger', { msg })
                }
            }
        })
    }
    else {
        //check userid if exist in db 
        await user.find({ _id: userid }, { _id: 1 }, (err, chat) => {
            if (err) {
                return res.send({
                    ischat: false,
                    msg: 'Internal Error'
                })
            }
            else {
                //check if this user is exist in messages feild 
                user.find({ _id: userid, "messages.id": objectid(data) }, { messages: 1 }, (err, naa) => {
                    if (err) {
                        return res.send({
                            ischat: false,
                            msg: 'Internal Error'
                        })
                    }
                    else {
                        //nag chat na sla before
                        if (naa.length != 0) {
                            //get previuos chats 
                            user.find({ _id: data }, { socket_id: 1, firstname: 1, middlename: 1, lastname: 1 }, (err, data_msg) => {
                                if (err) {
                                    return res.send({
                                        ischat: false,
                                        msg: 'Internal Error'
                                    })
                                }
                                else {
                                    req.session.my_ka_chat = data_msg[0]._id // userid sa ka chat nya ayeeeiiihhd
                                    const msg = {
                                        name: data_msg[0].firstname + ' ' + data_msg[0].middlename + ' ' + data_msg[0].lastname,
                                        socket: data_msg[0].socket_id,
                                        userid: userid,
                                        my_ka_chatid: data
                                    }
                                    return res.render('messages/_float_messenger', { msg })
                                }
                            })
                        }
                        //else wala sila nag chat before
                        else {
                            //get the fullname of user they want to chat 
                            user.find({ _id: data }, { firstname: 1, middlename: 1, lastname: 1 }, (err, fl_name) => {
                                if (!err) {
                                    //construct data for chats
                                    const new_chat = {
                                        id: fl_name[0]._id,
                                        fname: fl_name[0].firstname,
                                        mname: fl_name[0].middlename,
                                        lname: fl_name[0].lastname,
                                        created: Date.now(),
                                        chats: []
                                    }
                                    user.updateOne({ _id: userid }, { $push: { messages: new_chat } }, (err, chat_new) => {
                                        if (err) {
                                            return res.send({
                                                ischat: false,
                                                msg: 'Internal Error'
                                            })
                                        }
                                        else {

                                            user.find({ _id: data }, { socket_id: 1, firstname: 1, middlename: 1, lastname: 1 }, (err, data_msg) => {
                                                if (err) {
                                                    return res.send({
                                                        ischat: false,
                                                        msg: 'Internal Error'
                                                    })
                                                }
                                                else {
                                                    req.session.my_ka_chat = data_msg[0]._id // userid sa ka chat nya ayeeeiiihh
                                                    const msg = {
                                                        name: data_msg[0].firstname + ' ' + data_msg[0].middlename + ' ' + data_msg[0].lastname,
                                                        socket: data_msg[0].socket_id,
                                                        userid: userid,
                                                        my_ka_chatid: data
                                                    }
                                                    return res.render('messages/_float_messenger', { msg })
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    }
                })
            }
        })
    }
})
//get all chats 
router.post('/chats', isloggedin, async (req, res) => {
    const chat_id = req.session.my_ka_chat
    const userid = req.session.myid
    if (chat_id == 'admin') {
        //get all chats 
        try {
            await admin.find({ "messages.id": userid }, { messages: 1 }, (err, chats) => {
                if (!err) {
                    return res.render('messages/_chats', {
                        chat: chats[0].messages[0].chats,
                        fname: 'Bot',
                        userid: userid
                    })
                }
                else {
                    return res.send({
                        ischat: false
                    })
                }
            })
        } catch (error) {
            return res.send({
                ischat: false
            })
        }
    }
    else {
        //get all chats 
        await user.find({ _id: userid, "messages.id": chat_id }, { messages: 1 }, (err, chats) => {
            if (!err) {
                for (var i = 0; i < chats[0].messages.length; i++) {
                    if (chats[0].messages[i].id.toString() == chat_id.toString()) {
                        fname = chats[0].messages[i].fname
                        chats = chats[0].messages[i].chats
                        break
                    }
                }
                return res.render('messages/_chats', {
                    chat: chats,
                    fname: fname,
                    userid: userid
                })
            }
            else {
                return res.send({
                    ischat: false
                })
            }
        })
    }
})
//get recent chat id 
router.post('/chat-id', isloggedin, async (req, res) => {
    const chat_id = req.session.my_ka_chat
    if (chat_id) {
        return res.send({
            valid: true,
            id: chat_id
        })
    }
    else {
        return res.send({
            valid: false,
            id: null
        })
    }
})
module.exports = router