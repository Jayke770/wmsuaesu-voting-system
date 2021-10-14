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
                iscandidate: false,
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
                iscandidate: false,
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
// verify student id
router.post('/verify', normal_limit, async (req, res) => {
    const { id } = req.body
    try {
        await data.find({ "voterId.enabled": { $eq: false }, "voterId.student_id": { $eq: xs(id) } }).then((res_id) => {
            return res.send({
                isvalid: res_id.length === 0 ? false : true,
                id: xs(id),
                msg: res_id.length === 0 ? "Student ID not found" : "Student ID is valid"
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
                //check if the election is found 
                if(electionData.id !== ''){
                    //check if the election is not started
                    if(electionData.status === 'Not Started'){
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
                            text: `Election is already ${electionData.status}`
                        })
                    }
                } else {
                    return res.send({
                        joined: false,
                        msg: "Election Not Found", 
                        text: "Please check your election passcode"
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
router.post('/home/election/file-candidacy-form/', normal_limit, isloggedin, async (req, res) => {
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
router.post('/home/election/submit-candidacy-form/', normal_limit, isloggedin, async (req, res) => {
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
        reactions: [],
        views: [],
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
                "voters.id": {$eq: xs(myid)}
            }, {candidates: 1, autoAccept_candidates: 1, status: 1}).then( async (elec) => {
                if(elec.length !== 0){
                    if(elec[0].status === "Not Started"){
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
router.post('/home/election/re-submit-candidacy-form/', normal_limit, isloggedin, async (req, res) => { 
    const {electionID, myid} = req.session 
    const {student_id} = await user_data(myid)
    try {
        //check if election & candidate is exist 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            "candidates.student_id": {$eq: xs(student_id)}
        }, {candidates: 1}).then( async (elec) => {
            //if election & candidate is found 
            if(elec.length !== 0){
                //update status of candidate to pending 
                await election.updateOne({
                    _id: {$eq: xs(electionID)}, 
                    "candidates.student_id": {$eq: xs(student_id)}
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
        console.log(e)
        return res.status(500).send()
    }
})
// check candidacy form 
router.post('/home/election/candidacy-status/', normal_limit, isloggedin, async (req, res) => {
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
//update candidate platform 
router.post('/home/election/update-candidacy/', normal_limit, isloggedin, async (req, res) => {
    const {platform} = req.body 
    const {electionID, myid} = req.session
    const {_id, student_id} = await user_data(myid)  

    try {
        //check if the election is exists and voter & candidate is exists 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {id: xs(_id).toString()}}, 
            candidates: {$elemMatch: {student_id: xs(student_id)}}
        }, {
            voters: {$elemMatch: {id: xs(_id).toString()}}, 
            candidates: {$elemMatch: {student_id: xs(student_id)}}
        }).then( async (elec) => {
            if(elec.length > 0){
                //update candidate platform 
               await election.updateOne({
                   _id: {$eq: xs(electionID)}, 
                   "candidates.student_id": {$eq: xs(student_id)}
               }, {
                   $set: {"candidates.$.platform": xs(platform)}
               }).then( () => {
                   return res.send({
                    status: true, 
                    msg: "Platform successfully updated!"
                })
               }).catch( (e) => {
                   throw new Error(e)
               })
            } else {
                return res.send({
                    status: false, 
                    msg: "Candidate / Voter not found"
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
// delete candidacy form in current user 
router.post('/home/election/delete-candidacy/', normal_limit, isloggedin, async (req, res) => {
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
router.post('/home/election/status/main/', normal_limit, isloggedin, async (req, res) => {
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
router.post('/home/election/status/side-menu/', normal_limit, isloggedin, async (req, res) => {
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
                    iscandidate: false,
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
        return res.redirect('/home')
    }
})
//get all candidates 
router.get('/home/election/id/:electionID/candidates/', normal_limit, isloggedin, async (req, res) => {
    const {id} = req.body 
    const {electionID, myid} = req.session 
    const {_id, student_id} = await user_data(myid)

    try {
        //check if election & voter is exists 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {student_id: xs(student_id)}}
        }, {passcode: 0}).then( async (elec) => {
            return res.render('index', {
                joined: true,
                iscandidate: true,
                elections: elec[0], 
                data: {
                    course: await course(), 
                    year: await year(), 
                    partylists: await partylists(), 
                    positions: await positions(),
                }, 
                userData: await user_data(myid), 
                csrf: req.csrfToken()
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.redirect('/home')
    }
})
router.post('/home/election/id/:electionID/candidates/react-candidate/', normal_limit, isloggedin, async (req, res) => {
    const {caID} = req.body 
    const {electionID, myid} = req.session
    const {student_id} = await user_data(myid)
    try {
        //check if the recently reacted this candidate 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            candidates: {$elemMatch: {id: {$eq: xs(caID)}}}, 
            voters: {$elemMatch: {student_id: {$eq:  xs(student_id)}}}
        }, {
            candidates: {$elemMatch: {id: {$eq: xs(caID)}}}, 
            voters: {$elemMatch: {student_id: {$eq:  xs(student_id)}}}
        }).then( async (react_ca) => {
            if(react_ca.length > 0){
                const cv = react_ca[0]
                let reacted = false
                //check if the voter is already reacted this candidate 
                for(let i = 0; i < cv.candidates[0].reactions.length; i++){
                    if(myid.toString() === cv.candidates[0].reactions[i]){
                        reacted = true 
                        break
                    }
                }
                if(!reacted){
                    await election.updateOne({
                        _id: {$eq: xs(electionID)}, 
                        candidates: {$elemMatch: {id: {$eq: xs(caID)}}}
                    },{$push: {"candidates.$.reactions": xs(myid).toString()}}).then( () => {
                        return res.send({
                            status: true, 
                            msg: 'Successfully Reacted'
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else {
                    await election.updateOne({
                        _id: {$eq: xs(electionID)}, 
                        candidates: {$elemMatch: {id: {$eq: xs(caID)}}}
                    },{$pull: {"candidates.$.reactions": xs(myid).toString()}}).then( () => {
                        return res.send({
                            status: true, 
                            msg: 'Your Reaction Successfully Reacted'
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    msg: "Voter / Candidate not found"
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
module.exports = router
