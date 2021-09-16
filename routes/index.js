if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const xs = require('xss')
const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const user = require('../models/user')
const admin = require('../models/admin')
const data = require('../models/data')
const { authenticated, isadmin, isloggedin, take_photo, get_face } = require('./auth')
const { toUppercase, chat, bot, new_msg, new_nty, hash } = require('./functions')
const { normal_limit } = require('./rate-limit')
const election = require('../models/election')
const { v4: uuidv4 } = require('uuid')
const objectid = require('mongodb').ObjectID
const nl2br = require("nl2br")
const img2base64 = require('image-to-base64')
const path = require('path')
const fs = require('fs-extra')
const base64ToImage = require('base64-to-image')
const ftp = require('basic-ftp')
const moment = require('moment')
//profile 
router.get('/profile/:id', normal_limit, isloggedin, async (req, res) => {
    const id = req.params.id
    try {
        await user.find({ _id: { $eq: xs(id) } }).then((p) => {
            if (p.length === 0) {
                return res.status(404).render('error/404')
            } else {
                return res.render('profile/profile', {
                    data: p[0]
                })
            }
        }).catch((e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
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
//welcome page  contains login page ang registration
router.get('/', authenticated, normal_limit, async (req, res) => {
    try {
        await data.find({}, { course: 1, year: 1 }).then((cy) => {
            return res.render('auth', {
                course: cy.length === 0 ? [] : cy[0].course,
                year: cy.length === 0 ? [] : cy[0].year,
                csrf: req.csrfToken()
            })
        }).catch((e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//homepage
router.get('/home', normal_limit, isloggedin, async (req, res) => {
    const {myid} = req.session
    let voter_data
    try {
        await election.find(
            {"voters.id": {$eq: objectid(xs(myid))}}, 
            {election_title: 1, election_description: 1, status: 1, start: 1, end: 1, created: 1, candidates: 1, voters: 1}
        ).then( (el) => { 
            const voters = el.length === 0 ? [] : el[0].voters 
            if(voters.length !== 0){
                for(let i = 0; i < voters.length; i++){
                    if(myid.toString() === voters[i].id.toString()){
                        voter_data = voters[i]
                        break
                    }
                }
            }
            req.session.electionID = el.length === 0 ? '' : el[0]._id
            const data = el.length === 0 ? '' : el[0]
            const started = moment(data.start).fromNow().search("ago") != -1 ? true : false
            const end = moment(data.end).fromNow().search("ago") != -1 ? true : false
            return res.render('index', {
                is_join_election: el.length === 0 ? false : true,
                data: req.session.data, 
                election: el.length === 0 ? null : el[0], 
                started: started,
                end: end, 
                endtime: moment(data.end).fromNow(), 
                voterStatus: voter_data,
                csrf: req.csrfToken()
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
router.get('/logout', normal_limit, async (req, res) => {
    await req.session.destroy()
    return res.redirect('/')
})
//post
router.post('/verify', normal_limit, async (req, res) => {
    const { id } = req.body
    try {
        await data.find({ "voterId.enabled": { $eq: false }, "voterId.student_id": { $eq: xs(id) } }).then((res_id) => {
            return res.send({
                isvalid: res_id.length === 0 ? false : true,
                id: xs(id),
                msg: "Student Id is valid!"
            })
        }).catch((e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
router.post('/login', async (req, res) => {
    const { auth_usr, auth_pass } = req.body
    try {
        if (xs(auth_usr) !== "" && xs(auth_pass) !== "") {

            if (auth_usr == process.env.admin_username && auth_pass == process.env.admin_password) {
                await admin.find({}, (err, doc) => {
                    if (doc.length == 0) {
                        admin.create({
                            socket_id: "Waiting For Socket",
                            type: "admin"
                        }, (err, doc) => {
                            req.session.myid = doc._id
                            req.session.islogin = "okay"
                            req.session.user_type = doc.type
                            req.session.data = doc
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
                            //session
                            req.session.islogin = true // determine if logged
                            req.session.user_type = result[i].type // user type
                            req.session.myid = result[i]._id // user id
                            req.session.data = result[i]
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

        } else {
            return res.send({
                islogin: false,
                msg: "Please provide username & password"
            })
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//register
router.post('/register', async (req, res) => {
    const { student_id, fname, mname, lname, course, yr, type, usr, pass } = req.body
    const hash_password = await bcrypt.hash(xs(pass), 10)
    //check if all feilds is not empty
    try {
        if (fname != "" && mname != "" && lname != "" && course != "" && yr != "" && type != "") {
            //re-check voter id 
            await data.find(
                {
                    "voterId.student_id": { $eq: xs(student_id) },
                    "voterId.course": { $eq: xs(course) },
                    "voterId.year": { $eq: xs(yr) },
                    "voterId.enabled": { $eq: false }
                }
            ).then(async (v) => {
                if (v.length !== 0) {
                    //check if the username is not taken
                    await user.find({ username: { $eq: xs(usr) } }).then(async (u) => {
                        if (u.length !== 0) {
                            return res.send({
                                islogin: false,
                                msg: "Username is already taken"
                            })
                        }
                        //check if the student id is not registered 
                        await user.find({ student_id: { $eq: xs(student_id) } }).then(async (s) => {
                            if (s.length !== 0) {
                                return res.send({
                                    islogin: false,
                                    msg: "Student ID already registered"
                                })
                            }
                            //if the student id is not registered 
                            //save the new data 
                            await user.create({
                                student_id: xs(student_id),
                                firstname: xs(toUppercase(fname)),
                                middlename: xs(toUppercase(mname)),
                                lastname: xs(toUppercase(lname)),
                                course: xs(course),
                                year: xs(yr),
                                type: xs(type),
                                socket_id: 'Waiting For Student',
                                username: xs(usr),
                                password: hash_password
                            }).then(async (c) => {
                                //sessions
                                req.session.myid = c._id //session for student
                                req.session.islogin = true // to determine that user is now logged in
                                req.session.user_type = xs(type) //to determine the user type
                                req.session.data = c
                                //update the voter id and set enabled to true 
                                await data.updateOne({ "voterId.student_id": { $eq: xs(student_id) } }, { $set: { "voterId.$.enabled": true } }).then((vu) => {
                                    return res.send({
                                        islogin: true,
                                        msg: `Welcome ${xs(toUppercase(fname))}`
                                    })
                                }).catch((e) => {
                                    throw new Error(e)
                                })
                            }).catch((e) => {
                                throw new Error(e)
                            })
                        }).catch((e) => {
                            throw new Error(e)
                        })
                    }).catch((e) => {
                        throw new Error(e)
                    })
                } else {
                    return res.send({
                        islogin: false,
                        msg: "Invalid Course / Year",
                        text: "Please re-check your Course & Year"
                    })
                }
            }).catch((e) => {
                throw new Error(e)
            })
        } else {
            return res.send({
                islogin: false,
                msg: 'All Feilds Is Required'
            })
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//join election
router.post('/join-election', normal_limit, isloggedin, async (req, res) => {
    const { code } = req.body
    const id = req.session.myid
    const {firstname, middlename, lastname, course, year} = req.session.data
    let electionID, joined = false, e_title
    let new_voter = {
        id: id, 
        fullname: `${firstname} ${middlename} ${lastname}`,
        course: '', 
        year: '',
        status: 'Pending',
        created: moment().format()
    } 
    try {
        //get course & year 
        await data.find({}, {
            course: 1, 
            year: 1
        }).then( (cy) => {
            if(cy.length !== 0){
                for(let i = 0; i < cy[0].course.length; i++){
                    if(course === cy[0].course[i].id){
                        new_voter.course = cy[0].course[i].type 
                        break
                    }
                }
                for(let i = 0; i < cy[0].year.length; i++){
                    if(year === cy[0].year[i].id){
                        new_voter.year = cy[0].year[i].type 
                        break
                    }
                }
            }
        }).catch( (e) => {
            throw new Error(e)
        })
        await election.find({}).then(async (elec) => {
            if (elec.length !== 0) {
                for (let i = 0; i < elec.length; i++) {
                    const passcode = await bcrypt.compare(code, elec[i].passcode)
                    if (passcode) {
                        electionID = elec[i]._id
                        e_title = elec[i].election_title
                        break
                    }
                }
                //check  if the election id is not empty
                if (electionID) {
                    try {
                        await election.find({ _id: { $eq: xs(electionID) } }, { voters: 1 }).then(async (v) => {
                            if (v.length !== 0) {
                                //check if the voter did not join the election before  
                                for (let i = 0; i < v[0].voters.length; i++) {
                                    if (v[0].voters[i].toString() === id.toString()) {
                                        joined = true
                                        break
                                    }
                                }
                                if (!joined) {
                                    await election.updateOne({ _id: { $eq: xs(electionID) } }, { $push: { voters: new_voter } }).then(() => {
                                        req.session.electionID = xs(electionID)
                                        return res.send({
                                            joined: true,
                                            msg: `Welcome to ${e_title}`,
                                            text: ""
                                        })
                                    }).catch((e) => {
                                        throw new Error(e)
                                    })
                                } else {
                                    req.session.electionID = xs(electionID)
                                    return res.send({
                                        joined: false,
                                        msg: "You already joined the election",
                                        text: "Please restart your browser"
                                    })
                                }
                            } else {
                                return res.send({
                                    joined: false,
                                    msg: "Something went wrong",
                                    text: "Please try again later"
                                })
                            }
                        }).catch((e) => {
                            throw new Error(e)
                        })
                    } catch (e) {
                        throw new Error(e)
                    }
                } else {
                    return res.send({
                        joined: false,
                        msg: "Election not found",
                        text: "Please check the election passcode"
                    })
                }
            } else {
                return res.send({
                    joined: false,
                    msg: "Election not found",
                    text: "Please check the election passcode"
                })
            }
        }).catch((e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//leave election
router.post('/leave-election', normal_limit, isloggedin, async (req, res) => {
    const e_id = req.session.electionID
    console.log(e_id)
    const userID = req.session.myid 
    try {
        await election.find({
            _id: {$eq: xs(e_id)}, 
            "voters.id": {$eq: objectid(xs(userID))}
        }, {voters: 1}).then( async (v) => {
            if(v.length != 0){
                await election.updateOne({
                    _id: {$eq: xs(e_id)}
                }, {$pull: {
                    voters: {
                        id: {$eq: objectid(xs(userID))}
                    }}
                }).then( (b) => {
                    delete req.session.electionID
                    console.log(b)
                    return res.send({
                        leave: true, 
                        msg: 'Successfully left!'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    leave: false, 
                    msg: 'Something went wrong'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
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
                            user.find({ _id: { $eq: data } }, { socket_id: 1, firstname: 1, middlename: 1, lastname: 1 }, (err, data_msg) => {
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
                            user.find({ _id: { $eq: data } }, { firstname: 1, middlename: 1, lastname: 1 }, (err, fl_name) => {
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

                                            user.find({ _id: { $eq: data } }, { socket_id: 1, firstname: 1, middlename: 1, lastname: 1 }, (err, data_msg) => {
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
