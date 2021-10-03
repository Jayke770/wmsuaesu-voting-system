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
const election = require('../models/election')
const { authenticated, isadmin, isloggedin, take_photo, get_face } = require('./auth')
const { toUppercase, chat, bot, new_msg, new_nty, hash, course, year, partylists, positions, user_data, mycourse, myyear, compareHash} = require('./functions')
const { normal_limit } = require('./rate-limit')
const { v4: uuidv4 } = require('uuid')
const objectid = require('mongodb').ObjectID
const nl2br = require("nl2br")
const img2base64 = require('image-to-base64')
const path = require('path')
const fs = require('fs-extra')
const base64ToImage = require('base64-to-image')
const ftp = require('basic-ftp')
const moment = require('moment-timezone')
//profile 
router.get('/profile/:id', normal_limit, isloggedin, async (req, res) => {
    const id = req.params.id
    let courses, year
    try {
        //get courses & years 
        await data.find({},{course: 1, year: 1}).then( (cy) => {
            courses = cy[0].length === 0 ? [] : cy[0].course
            year = cy[0].length === 0 ? [] : cy[0].year
        }).catch( (e) => {
            throw new Error(e)
        })
        await user.find({ _id: { $eq: xs(id) } }).then((p) => {
            if (p.length === 0) {
                return res.status(404).render('error/404')
            } else {
                return res.render('profile/profile', {
                    data: p[0], 
                    course: courses, 
                    year: year
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
    delete req.session.electionID
    const {myid} = req.session 
    const {elections} = await user_data(myid)
    let electionsJoined = []
    try {
        //check if the user joined any election 
        if(elections.length !== 0){
            //get all elections 
            for(let i = 0; i < elections.length; i++){
                await election.find({_id: {$eq: xs(elections[i])}}, {passcode: 0}).then( (elec) => {
                    elec.length === 0 ? electionsJoined.push() : electionsJoined.push(elec[0])
                }).catch( (e) => {
                    throw new Error(e)
                })
            }
            return res.render('index', {
                joined: false,
                elections: electionsJoined, 
                data: {
                    positions: await positions(), 
                    partylists: await partylists(), 
                    course: await course(), 
                    year: await  year()
                }, 
                userData: await user_data(myid), 
                csrf: req.csrfToken()
            })
        } else {
            return res.render('index', {
                joined: false,
                elections: electionsJoined, 
                data: {
                    positions: await positions(), 
                    partylists: await partylists(), 
                    course: await course(), 
                    year: await  year()
                }, 
                userData: await user_data(myid), 
                csrf: req.csrfToken()
            })
        }
    } catch (e) {
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
                            req.session.data = await user_data(result[i]._id)
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
router.post('/home/join-election/', normal_limit, isloggedin, async (req, res) => {
    const {code} = req.body 
    const {myid} = req.session 
    const {_id, firstname, lastname, middlename, course, year, student_id, elections} = await user_data(myid)
    let new_voter = {
        id: xs(_id), 
        student_id: xs(student_id),
        fullname: `${xs(firstname)} ${xs(middlename)} ${xs(lastname)}`,
        course: await mycourse(course), 
        year: await myyear(year),
        status: '?',
        voted: false,
        created: moment().tz("Asia/Manila").format()
    },  
    electionData = {
        id: '',
        title: '', 
        isjoined: false,
        autoAccept: null,
        status: ''
    }

    try {
        //get all elections and compare the given passcode of user  
        await election.find({}, {passcode: 1, election_title: 1, status: 1, autoAccept_voters: 1,}).then( async (elec) => {
            //check if theres any election found in query 
            if(elec.length !== 0){
                //get all the passcode and compare 
                for(let i = 0; i < elec.length; i++){
                    if(await compareHash(xs(code), elec[i].passcode)){
                        electionData.id = elec[i]._id.toString()
                        electionData.title = elec[i].election_title 
                        electionData.isjoined = true 
                        electionData.status = elec[i].status
                        electionData.autoAccept = elec[i].autoAccept_voters
                        break
                    }
                }

                const isEnded = electionData.status === 'Ended' ? true : false 
                const isPending4deletion = electionData.status === 'Pending for deletion' ? true : false 
                //check if the election is not ended or pending for deletion
                if(!isEnded && !isPending4deletion){
                    //check this election id in the elections feild of user
                    let electionExists = false 
                    for(let i = 0; i < elections.length; i++){
                        if(elections[i] === electionData.id){
                            electionExists = true
                        }
                    }
                    //if election id not found in user elections feild 
                    if(!electionExists){
                        //insert new voter 
                        electionData.autoAccept ? new_voter.status = 'Accepted' : new_voter.status = 'Pending'
                        await election.updateOne({
                            _id: {$eq: xs(electionData.id)}
                        }, {$push: {voters: new_voter}}).then( async () => {
                            //push the election id to user elections feild 
                            await user.updateOne({
                                _id: {$eq: xs(_id)}
                            }, {$push: {elections: xs(electionData.id)}}).then( () => {
                                return res.send({
                                    joined: true,
                                    electionID: xs(electionData.id),
                                    msg: `Welcome to ${electionData.title}`,
                                    text: new_voter.status === 'Pending' ? "Please wait for the admin to accept your voter request" : "Your request was accepted!"
                                })
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            joined: false, 
                            msg: "You already joined this election", 
                            text: "Please refresh the app"
                        })
                    }
                } else {
                    return res.send({
                        joined: false, 
                        msg: "You can't join this election",
                        text: `Election is ${electionData.status}`
                    })
                }
            } else {
                return res.send({
                    joined: false,
                    msg: "Election Not Found",
                    text: "Database election collections is empty"
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
    // const { code } = req.body
    // const id = req.session.myid
    // const {firstname, middlename, lastname, course, year, student_id, elections} = await user_data(id)
    // let electionID, joined = false, e_title
    // let new_voter = {
    //     id: id, 
    //     student_id: student_id,
    //     fullname: `${firstname} ${middlename} ${lastname}`,
    //     course: '', 
    //     year: '',
    //     status: '?',
    //     voted: false,
    //     created: moment().tz("Asia/Manila").format()
    // } 
    // try {
    //     //get course & year 
    //     await data.find({}, {
    //         course: 1, 
    //         year: 1
    //     }).then( (cy) => {
    //         if(cy.length !== 0){
    //             for(let i = 0; i < cy[0].course.length; i++){
    //                 if(course === cy[0].course[i].id){
    //                     new_voter.course = cy[0].course[i].type 
    //                     break
    //                 }
    //             }
    //             for(let i = 0; i < cy[0].year.length; i++){
    //                 if(year === cy[0].year[i].id){
    //                     new_voter.year = cy[0].year[i].type 
    //                     break
    //                 }
    //             }
    //         }
    //     }).catch( (e) => {
    //         throw new Error(e)
    //     })
    //     await election.find({}).then(async (elec) => {
    //         if (elec.length !== 0) {
    //             for (let i = 0; i < elec.length; i++) {
    //                 const passcode = await bcrypt.compare(code, elec[i].passcode)
    //                 if (passcode) {
    //                     electionID = elec[i]._id
    //                     e_title = elec[i].election_title
    //                     break
    //                 }
    //             }
    //             //check if the election id is not empty
    //             if (electionID) { 
    //                 try {
    //                     //check the user election list if this election is not present 
    //                     if(elections.length !== 0){
    //                         for(let i = 0; i < elections.length; i++){
    //                             if(elections[i] === electionID){
    //                                 return res.send({
    //                                     joined: false,
    //                                     msg: "You already joined the election",
    //                                     text: "Please restart your browser"
    //                                 })
    //                             }
    //                         }
    //                     } 
    //                     await election.find({ _id: { $eq: xs(electionID) } }, { voters: 1, autoAccept_voters: 1, status: 1}).then(async (v) => {
    //                         if (v.length !== 0) {
    //                             //if election has a autoAccept_voters feature 
    //                             v[0].autoAccept_voters ? new_voter.status = 'Accepted' : new_voter.status = 'Pending'
    //                             //check if the voter did not join the election before  
    //                             for (let i = 0; i < v[0].voters.length; i++) {
    //                                 if (v[0].voters[i].id === id) {
    //                                     joined = true
    //                                     break
    //                                 }
    //                             }
    //                             if (!joined) {
    //                                 //check if the election is not close or Pending for deletion 
    //                                 if(v[0].status === 'Closed' || v[0].status === 'Pending for deletion'){
    //                                     return res.send({
    //                                         joined: false, 
    //                                         msg: "You can't join this election",
    //                                         text: `Election is ${v[0].status}`
    //                                     })
    //                                 } else {
    //                                     //add election id to user elections that he/she joined 
    //                                     await user.updateOne({_id: {$eq: xs(id)}}, {$push: {elections: xs(electionID)}}).then( async () => {
    //                                         //add user to election voters
    //                                         await election.updateOne({ _id: { $eq: xs(electionID) } }, { $push: { voters: new_voter } }).then(() => {
    //                                             return res.send({
    //                                                 joined: true,
    //                                                 electionID: electionID,
    //                                                 msg: `Welcome to ${e_title}`,
    //                                                 text: ""
    //                                             })
    //                                         }).catch((e) => {
    //                                             throw new Error(e)
    //                                         })
    //                                     }).catch( (e) => {
    //                                         throw new Error(e)
    //                                     })
    //                                 }
    //                             } else {
    //                                 return res.send({
    //                                     joined: false,
    //                                     msg: "You already joined the election",
    //                                     text: "Please restart your browser"
    //                                 })
    //                             }
    //                         } else {
    //                             return res.send({
    //                                 joined: false,
    //                                 msg: "Something went wrong",
    //                                 text: "Please try again later"
    //                             })
    //                         }
    //                     }).catch((e) => {
    //                         throw new Error(e)
    //                     })
    //                 } catch (e) {
    //                     throw new Error(e)
    //                 }
    //             } else {
    //                 return res.send({
    //                     joined: false,
    //                     msg: "Election not found",
    //                     text: "Please check the election passcode"
    //                 })
    //             }
    //         } else {
    //             return res.send({
    //                 joined: false,
    //                 msg: "Election not found",
    //                 text: "Please check the election passcode"
    //             })
    //         }
    //     }).catch((e) => {
    //         throw new Error(e)
    //     })
    // } catch (e) {
    //     return res.status(500).send()
    // }
})
//leave election
router.post('/home/leave-election/', normal_limit, isloggedin, async (req, res) => {
    const {electionID, myid} = req.session
    const data = await user_data(myid)
    try {
        await election.find({
            _id: {$eq: xs(electionID)}, 
            "voters.id": {$eq: xs(data._id)}
        }, {voters: 1}).then( async (v) => {
            if(v.length != 0){
                // delete candidacy form if exists and voter data from election
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {
                    $pull: {
                        candidates: {student_id: {$eq: data.student_id}},
                        voters: {student_id: {$eq: data.student_id}}
                    }
                }).then( async () => {
                    //remove election in user election feild 
                    await user.updateOne({
                        _id: {$eq: xs(data._id)}
                    }, {$pull: {elections: xs(electionID)}}).then( () => {
                        delete req.session.electionID
                        return res.send({
                            leave: true, 
                            msg: 'Successfully left!'
                        })
                    }).catch( (e) => {
                        throw new Error(e)
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
        return res.status(500).send()
    }
})
//req for file candidancy form
router.post('/election/file-candidacy-form/', normal_limit, isloggedin, async (req, res) => {
    const {electionID, myid} =  req.session
    try {
        //check election 
        await election.find({_id: {$eq: xs(electionID)}}).then( async (elec) => {
            //if election is found 
            if(elec.length !== 0){
                //render the file candidacy form 
                return res.render('election/file-candidacy-form', {
                    user: await user_data(myid),
                    data: {
                        course: await course(), 
                        year: await year(), 
                        partylists: await partylists(), 
                        positions: await positions(),
                    }, 
                    election: {
                        partylists: elec[0].partylist,
                        positions: elec[0].positions
                    }
                })
            } else {
                throw new Error('Election not found')
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// submit candidacy form 
router.post('/election/submit-candidacy-form/', normal_limit, isloggedin, async (req, res) => {
    const {pty, pos, platform} = req.body 
    const {myid, electionID} = req.session
    const data = await user_data(xs(myid))
    let new_candidate = {
        id: uuidv4(), 
        student_id: data.student_id,
        fullname: `${data.firstname} ${data.middlename} ${data.lastname}`, 
        course: data.course, 
        year: data.year, 
        partylist: xs(pty), 
        position: xs(pos), 
        platform: xs(platform),
        votes: [],
        status: '?', 
        msg: '',
        created: moment().tz("Asia/Manila").format()
    }
    try {
        //user type if == Candidate 
        if(data.type === 'Candidate'){
            //check election if exists & the user is a voter of the election
            await election.find({
                _id: {$eq: xs(electionID)},
                "voters.id": {$eq: objectid(xs(myid))}
            }, {candidates: 1, autoAccept_candidates: 1, status: 1}).then( async (elec) => {
                if(elec.length !== 0){
                    const is_ended = elec[0].status === 'Ended' ? true : false 
                    const is_pend_for_del = !is_ended && elec[0].status === 'Pending for deletion' ? true : false
                    if(!is_ended && !is_pend_for_del){
                        //if the auto accept candidates feature is enabled to this election accept the candidate automatically 
                        elec[0].autoAccept_candidates ? new_candidate.status = 'Accepted' : new_candidate.status = 'Pending'
                        //check the new candidate is not candidate 
                        const candidates = elec[0].candidates 
                        let iscandidate = false
                        for(let i = 0; i < candidates.length; i++){
                            if(data.student_id === candidates[i].student_id){
                                iscandidate = true 
                                break
                            }
                        }
                        //if not candidate
                        if(!iscandidate){
                            //push the new candidate in election
                            await election.updateOne({
                                _id: {$eq: xs(electionID)}
                            }, {$push: {candidates: new_candidate}}).then( (new_c) => {
                                return res.send({
                                    status: true,
                                    txt: elec[0].autoAccept_candidates ? 'Candidacy successfully accepted' : 'Form successfully submitted', 
                                    msg: elec[0].autoAccept_candidates ? '' : 'Please wait for the admin to accept your candidacy form'
                                })
                            })
                        } else {
                            return res.send({
                                status: false, 
                                txt: "You're already a candidate", 
                                msg: 'Please wait for the admin to accept your candidacy form'
                            })
                        }
                    } else {
                        return res.send({
                            status: false, 
                            txt: `Election is ${elec[0].status}`, 
                            msg: `You can't submit your candidacy form once the election is ${elec[0].status}`
                        })
                    }
                } else {
                    return res.send({
                        status: false, 
                        txt: 'Something went wrong!', 
                        msg: 'Invalid election / you are not a voter of this election'
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            return res.send({
                status: false, 
                txt: 'Something went wrong!', 
                msg: 'Invalid user form cannot be submitted'
            })
        }
    } catch (e) {
        return res.status(500).send()
    }
})
// resubmit candidacy form after rejected by admin 
router.post('/election/re-submit-candidacy-form/', normal_limit, isloggedin, async (req, res) => {
    const {id} = req.body 
    const {electionID} = req.session 
    
    try {
        //check if election & candidate is exist 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            "candidates.id": {$eq: xs(id)}
        }, {candidates: 1}).then( async (elec) => {
            //if election & candidate is found 
            if(elec.length !== 0){
                //update status of candidate to pending 
                await election.updateOne({
                    _id: {$eq: xs(electionID)}, 
                    "candidates.id": {$eq: xs(id)}
                }, {$set: {"candidates.$.status": 'Pending'}}).then( (u) => {
                    return res.send({
                        status: true, 
                        msg: 'Form Resubmitted successfully'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: 'Election / Candidate not found'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// check candidacy form 
router.post('/election/candidacy-status/', normal_limit, isloggedin, async (req, res) => {
    const {electionID, myid} = req.session
    const userData = await user_data(myid) 
    try {
        // //check if election & candidate is exists 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            candidates: {$elemMatch: {student_id: userData.student_id}}
        }, {candidates: {$elemMatch: {student_id: userData.student_id}}}).then( (v) => {
            //check result 
            if(v.length !== 0){
                //if candidate was found 
                return res.render('election/candidacy-status', {
                    candidacy: v[0].candidates[0]
                })
            } else {
                return res.send(false)
            }   
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// delete candidacy form in current user 
router.post('/election/delete-candidacy/', normal_limit, isloggedin, async (req, res) => {
    const {candidateID} = req.body
    const {electionID} = req.session

    try {
        //check if candidate & election is exists 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            candidates: {$elemMatch: {id: xs(candidateID)}}
        }, {candidates: {$elemMatch: {id: xs(candidateID)}}}).then( async (ca) => {
            //if candidate is found 
            if(ca.length !== 0){
                //pull the candidate in election 
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {$pull: {candidates: {id: xs(candidateID)}}}).then( (ca_up) => {
                    return res.send({
                        status: true,
                        msg: 'Candidacy deleted successfully!'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: 'Candidate not found', 
                    msg: 'Try to refresh the app'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
}) 
// election status main 
router.post('/election/status/main/', normal_limit, isloggedin, async (req, res) => {
    const {electionID, myid} = req.session 
    const userData = await user_data(myid)
    let electionsJoined = []
    try {
        if(!xs(electionID)){
            //get all election atented by this user 
            if(userData.elections.length !== 0){
                for(let i = 0; i < userData.elections.length; i++){
                    await election.find({
                        _id: {$eq: xs(userData.elections[i])}
                    }, {passcode: 0}).then( (elec) => {
                        elec.length === 0 ? electionsJoined.push() : electionsJoined.push(elec[0])
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                }
                return res.render('election/main', {
                    joined: false, 
                    elections: electionsJoined, 
                    userData: userData
                })
            } else {
                return res.render('election/main', {
                    joined: false, 
                    elections: [], 
                    userData: userData
                })
            }
        } else {
            // election description, title, start & end time, voter request status 
            await election.find({
                _id: {$eq: xs(electionID)}, 
                voters: {$elemMatch: {student_id: {$eq: xs(userData.student_id)}}}
            }, {
                voters: {$elemMatch: {student_id: {$eq: xs(userData.student_id)}}}, 
                passcode: 0
            }).then( (elec) => {
                if(elec.length !== 0){
                    return res.render('election/main', {
                        joined: true, 
                        elections: elec[0], 
                        userData: userData
                    })
                } else {
                    throw new Error(e)
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        }
    } catch (e) {
        return res.status(500).send()
    }
})
// election status side menu 
router.post('/election/status/side-menu/', normal_limit, isloggedin, async (req, res) => {
    const {electionID, myid} = req.session 
    const userData = await user_data(myid)
    try {
        // election description, title, start & end time, voter request status 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {student_id: {$eq: xs(userData.student_id)}}}
        }, {
            voters: {$elemMatch: {student_id: {$eq: xs(userData.student_id)}}}, 
            passcode: 0
        }).then( (elec) => {
            if(elec.length !== 0){
                return res.render('election/side_menu', {
                    joined: true, 
                    elections: elec[0], 
                    userData: userData
                })
            } else {
                throw new Error(e)
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//when user try to enter the election he/she joined
router.get('/home/election/id/:electionID/', normal_limit, isloggedin, async (req, res) => {
    const {electionID} = req.params
    const {myid} = req.session 
    const {student_id} = await user_data(myid)
    try {
        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {student_id: {$eq: xs(student_id)}}}
        }, { 
            voters: {$elemMatch: {student_id: {$eq: xs(student_id)}}}, 
            passcode: 0
        }).then( async (elec) => {
            if(elec.length !== 0){
                req.session.electionID = xs(electionID)
                return res.render('index', {
                    joined: true,
                    elections: elec[0],
                    data: {
                        positions: await positions(), 
                        partylists: await partylists(), 
                        course: await course(), 
                        year: await  year()
                    }, 
                    userData: await user_data(myid), 
                    csrf: req.csrfToken()
                })
            } else {
                throw new Error('Election not found')
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
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
