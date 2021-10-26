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
const { authenticated, isadmin, isloggedin, take_photo, get_face, send_verification_email} = require('./auth')
const { toUppercase, hash, course, year, partylists, positions, user_data, mycourse, myyear, myposition, compareHash} = require('./functions')
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
const uaParser = require('ua-parser-js')
const emailValidator = require('is-email')
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
                isvoting: false,
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
                isvoting: false,
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
router.get('/home/logout/', normal_limit, async (req, res) => {
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
router.post('/login', normal_limit, async (req, res) => {
    const { auth_usr, auth_pass } = req.body
    const ua = req.headers['user-agent']
    try {
        if (xs(auth_usr) && xs(auth_pass)) {
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
            } 
            else {
                await user.find({$or: [
                    {username: {$eq: xs(auth_usr)}}, 
                    {"email.email": {$eq: xs(auth_usr)}}
                ]}, {password: 1, firstname: 1, type: 1}).then( async (usp) => {
                    if(usp.length > 0){
                        if(await compareHash(xs(auth_pass), usp[0].password)){
                            //session
                            req.session.islogin = true // determine if logged
                            req.session.user_type = usp[0].type // user type
                            req.session.myid = usp[0]._id // user id
                            req.session.data = await user_data(usp[0]._id)
                            return res.send({
                                islogin: true,
                                msg: "Welcome " + usp[0].firstname
                            })
                        } else {
                            return res.send({
                                islogin: false,
                                msg: "Incorrect Password"
                            })
                        }
                    } else {
                        return res.send({
                            islogin: false,
                            msg: "Account Not Found"
                        })
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            }
        } else {
            return res.send({
                islogin: false,
                msg: "Please provide username & password"
            })
        }
    } catch (e) {
        console.log(e)
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
                                socket_id: 'Offline',
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
        voted: [],
        created: moment().tz("Asia/Manila").format()
    },  
    electionData = {
        id: '',
        title: '', 
        course: null, 
        year: null,
        isjoined: false,
        autoAccept: null,
        status: ''
    }

    try {
        //get all elections and compare the given passcode of user  
        await election.find({}, {passcode: 1, election_title: 1, status: 1, autoAccept_voters: 1, courses: 1, year: 1}).then( async (elec) => {
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
                        electionData.course = elec[i].courses
                        electionData.year = elec[i].year
                        break
                    }
                }
                //check if the election is found 
                if(electionData.id !== ''){
                    let crs = false, yr = false
                    //check if the user course & year is eligble for this election 
                    for(let c = 0; c < electionData.course.length; c++){
                        if(electionData.course[c] === course){
                            crs = true
                            break
                        }
                    }
                    for(let y = 0; y < electionData.year.length; y++){
                        if(electionData.year[y] === year){
                            yr = true
                            break
                        }
                    }
                    //check if the election is not started
                    if(crs && yr){
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
                            msg: "Oopps..", 
                            text: `${await mycourse(course)} ${await myyear(year)} is not eligible for this election`
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
                    isvoting: false,
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
                isvoting: false,
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
//react candidate
router.post('/home/election/id/*/candidates/react-candidate/', normal_limit, isloggedin, async (req, res) => {
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
        return res.status(500).send()
    }
})
//view candidate 
router.post('/home/election/id/*/candidates/view-candidate/', normal_limit, isloggedin, async (req, res) => {
    const {caID} = req.body
    const {electionID, myid} = req.session 
    try {
        // check election, voter & candidate if exists 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}, 
            candidates: {$elemMatch: {id: xs(caID)}}
        }, {
            voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}, 
            candidates: {$elemMatch: {id: xs(caID)}}
        }).then( async (elec) => {
            if(elec.length > 0){
                let ca_profile_id
                //get profile id 
                await user.find({
                    student_id: {$eq: xs(elec[0].candidates[0].student_id)}
                }, {_id: 1}).then( async (sid) => {
                    if(sid.length > 0){
                        //add candidate views 
                        await election.updateOne({
                            _id: {$eq: xs(electionID)}, 
                            candidates: {$elemMatch: {id: {$eq: xs(caID)}}}
                        },{$push: {"candidates.$.views": xs(myid).toString()}}).then( async (b) => {
                            await election.find({
                                _id: {$eq: xs(electionID)}, 
                                voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}, 
                                candidates: {$elemMatch: {id: xs(caID)}}
                            }, {
                                voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}, 
                                candidates: {$elemMatch: {id: xs(caID)}}
                            }).then( async (elecs) => {
                                return res.render('election/candidates-view-info', {
                                    candidateInfo: elecs[0].candidates[0], 
                                    candidatesUserInfo: await user_data(sid[0]._id), 
                                    data: {
                                        positions: await positions(),
                                        partylists: await partylists(), 
                                        year: await year(), 
                                        course: await course()
                                    }
                                })
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        throw new Error("User Not Found")
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                throw new Error('Not Found')
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//vote 
router.get('/home/election/id/*/vote/', normal_limit, isloggedin, async (req, res) => {
    const {electionID, myid} = req.session 
    
    try {
        //get election details 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}
        }, {voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}, passcode: 0}).then( async (elec) => {
            if(elec.length > 0){
                //check if election started 
                if(elec[0].status === "Started"){
                    return res.render('index', {
                        elections: elec[0],
                        joined: true,
                        isvoting: true,
                        iscandidate: false,
                        data: {
                            positions: await positions(), 
                            partylists: await partylists(), 
                            course: await course(), 
                            year: await year()
                        }, 
                        userData: await user_data(myid),
                        csrf: req.csrfToken()
                    })
                } else {
                    return res.status(401).send('fasff')
                }
            } else {
                return res.status(404).render('error/404')
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {

    }
})
//submit vote 
router.post('/home/election/id/*/vote/submit-vote/', normal_limit, isloggedin, async (req, res) => {
    const {vote, positionType} = req.body 
    const {electionID, myid} = req.session
    const {firstname} = await user_data(myid)
    try {
        //check position type 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            positions: {$elemMatch: {id: {$eq: xs(positionType)}}}
        }, {
            positions: {$elemMatch: {id: {$eq: xs(positionType)}}}
        }).then( async (elec_p) => {
            if(elec_p.length > 0){
                if(xs(vote)){
                    if(parseInt(elec_p[0].positions[0].maxvote) >= vote.length){
                        //check if the user already voted to this tier of candidates 
                        let isvoted = false, ca_in_position = []
                        //get all candidates 
                        await election.find({_id: {$eq: xs(electionID)}}, {candidates: 1}).then( async (ca_elec) => {
                            if(ca_elec.length > 0){
                                const candidates = ca_elec[0].candidates 
                                for(let c = 0; c < candidates.length; c++){
                                    if(candidates[c].position === xs(positionType)){
                                        ca_in_position.push(candidates[c].votes)
                                    }
                                }
                                //check if the user already voted with this position 
                                if(ca_in_position.length > 0){
                                    for(let v = 0; v < ca_in_position.length; v++){
                                        for(let vote = 0; vote < ca_in_position[v].length; vote++){
                                            if(ca_in_position[v][vote] === xs(myid).toString()){
                                                isvoted = true
                                            }
                                        }
                                    }
                                    //if the user is not voted
                                    if(!isvoted){
                                        for(let k = 0; k < vote.length; k++){
                                            //insert new vote 
                                            await election.updateOne({
                                                _id: {$eq: xs(electionID)}, 
                                                "candidates.id": {$eq: xs(vote[k])}
                                            }, {$push: {"candidates.$.votes": xs(myid).toString()}}).then( () => {
                                                return res.send({
                                                    status: true, 
                                                    txt: 'Vote submitted successfully', 
                                                    msg: `Have a nice day ${firstname}!`
                                                })
                                            }).catch( (e) => {
                                                throw new Error(e)
                                            })
                                        }
                                    } else {
                                        return res.send({
                                            status: false,
                                            txt: "Oops..", 
                                            msg: `You already submitted a vote for ${await myposition(xs(positionType))}`
                                        })
                                    }
                                } else {
                                    return res.send({
                                        status: false,
                                        txt: "Candidates Not Found", 
                                        msg: "Please refresh the app!"
                                    })
                                }
                            } else {
                                throw new Error("Election Not Found")
                            }
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            txt: "Invalid Vote", 
                            msg: `Please select up to ${parseInt(elec_p[0].positions[0].maxvote)} candidate for ${await myposition(xs(positionType))}`
                        })
                    }
                } else {
                    return res.send({
                        status: false, 
                        txt: "Invalid Vote", 
                        msg: `Please choose up to ${parseInt(elec_p[0].positions[0].maxvote)} candidate for ${await myposition(xs(positionType))}`
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    txt: 'Position Not Found',
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
//###################################################################
//account settings menu
router.post('/account/settings-menu/', normal_limit, isloggedin, async (req, res) => {
    const {myid} = req.session 
    try {
        //get user informtion 
        await user.find({_id: {$eq: xs(myid)}}, {password: 0, messages: 0, notifications: 0, hearts: 0, visitors: 0, comments: 0}).then( async (userData) => {
            if(userData.length > 0){
                return res.render('account/settings-menu', {
                    user: userData[0], 
                    data: {
                        courses: await course(), 
                        year: await year()
                    }
                })
            } else {
                return res.status(404).send()
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//account settings menu item
router.post('/account/settings/:menu/', normal_limit, isloggedin, async (req, res) => {
    const {menu} = req.params 
    const {myid} = req.session
    
    try {
        await user.find({_id: {$eq: xs(myid)}}, {password: 0}).then( async (userData) => {
            if(userData.length > 0){
                return res.render(`account/settings-${xs(menu)}`, {
                    userData: userData[0], 
                    data: {
                        courses: await course(), 
                        year: await year()
                    }
                })
            } else {
                throw new Error('User Not FOund')
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//change user type
router.post('/account/settings/menu/change-user-type/', normal_limit, isloggedin, async (req, res) => {
    const {type} = req.body
    const {myid} = req.session 

    try {
        if(type){
            await user.find({_id: {$eq: xs(myid)}}, {"settings.usertype": 1}).then( async (usertype) => {
                if(usertype.length > 0){
                    if(usertype[0].settings.usertype.status === 'Accepted'){
                        return res.send({
                            status: false, 
                            msg: 'User Type already changed'
                        })
                    } else {
                        if(usertype[0].settings.usertype.status === 'Pending'){
                            return res.send({
                                status: false, 
                                msg: 'Request is already pending'
                            })
                        } else {
                            await user.updateOne({
                                _id: {$eq: xs(myid)}
                            }, {$set: {
                                "settings.usertype.status": 'Pending', 
                                "settings.usertype.value": xs(type), 
                                "settings.usertype.requested": moment().tz("Asia/Manila").format()
                            }}).then( () => {
                                return res.send({
                                    status: true, 
                                    msg: 'Request submitted'
                                })
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }
                    }
                } else {
                    return res.send({
                        status: false, 
                        msg: 'User ID not found'
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            return res.send({
                status: false, 
                msg: 'Select new user type'
            })
        }
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//change e-mail 
router.post('/account/settings/menu/change-e-mail', normal_limit, isloggedin, async (req, res) => {
    const {nmail, pass} = req.body 
    const {myid} = req.session
    const {firstname} = await user_data(myid)
    try {
        //check if the is valid
        if(emailValidator(xs(nmail))){
            //check if the email is not the same in another use 
            await user.find({
                _id: {$ne: xs(myid)}, 
                "email.email": {$eq:xs(nmail)}
            }).then( async (em_status) => {
                if(em_status.length > 0){
                    return res.send({
                        status: false, 
                        txt: "Invalid E-mail", 
                        msg: 'E-mail is already in used by another user'
                    })
                } else {
                    //get email & password
                    await user.find({_id: {$eq: xs(myid)}}, {password: 1, email: 1}).then( async (userData) => {
                        if(userData.length > 0){
                            //check password
                            if(await compareHash(xs(pass), userData[0].password)){
                                if(userData[0].email.email){
                                    return res.send({
                                        status: false, 
                                        txt: "You already added an email", 
                                        msg: 'If you want to change your email please remove the old one'
                                    }) 
                                } else {
                                    await user.find({
                                        _id: {$ne: xs(myid)}, 
                                        email: {email: {$eq: xs(nmail)}}
                                    }).then( async (the_same) => {
                                        if(the_same.length === 0){
                                            const email_id = uuidv4()
                                            await user.updateOne({
                                                _id: { $eq: xs(myid) }
                                            }, {$set: {
                                                "email.id": email_id, 
                                                "email.email": xs(nmail), 
                                                "email.status": "Not Verified", 
                                                "email.added": moment().tz("Asia/Manila").format()
                                            }}).then(() => {
                                                //send verification  
                                                send_verification_email(firstname, xs(nmail), xs(myid.toString()), email_id)
                                                return res.send({
                                                    status: true,
                                                    txt: "Verification Sent Successfully",
                                                    msg: 'Please check your E-mail inbox'
                                                })
                                            }).catch((e) => {
                                                throw new Error(e)
                                            })
                                        } else {
                                            return res.send({
                                                status: false,
                                                txt: "This email is already in used",
                                                msg: 'Please use another e-mail, This email is already in used by another user'
                                            })
                                        }
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                }
                            } else {
                                return res.send({
                                    status: false, 
                                    txt: "Incorrect Password", 
                                    msg: 'Please Try Again'
                                })
                            }
                        } else {
                            return res.send({
                                status: false, 
                                txt: "User ID not found", 
                                msg: 'Please Refresh your browser'
                            })
                        }
                    })
                }
            })
        } else {
            return res.send({
                status: false, 
                txt: "Invalid E-mail", 
                msg: 'E-mail is the same with your another e-mail'
            })
        }
    } catch (e){ 
        console.log(e) 
        return res.status(500).send()
    }
})
//email verification 
router.get('/account/settings/verify-email/:email/:emailID/:id/', normal_limit, async (req, res) => {
    const {email, id, emailID} = req.params
    try {
        //check email & emailID 
        await user.find({
            _id: {$eq: xs(id)}, 
            $and: [
                {"email.id": {$eq: xs(emailID)}}, 
                {"email.email": {$eq: xs(email)}}, 
                {"email.status": 'Not Verified'}
            ]
        }).then( (em) => {
            if(em.length > 0){
                return res.render('account/settings-email-verify', {
                    email: xs(email), 
                    csrf: req.csrfToken()
                })
            } else {
                return res.status(404).render('error/404')
            }
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//confirm email
router.post('/account/settings/verify-email/:email/:emailID/:id/', normal_limit, async (req, res) => {
    const {pass} = req.body
    const {email, emailID, id} = req.params
    try {
        await user.find({_id: {$eq: xs(id)}}, {email: 1, password: 1}).then( async (userData) => {
            if(userData.length > 0){
                //check password 
                if(await compareHash(xs(pass), userData[0].password)){
                    if(userData[0].email.id === xs(emailID) && userData[0].email.status === "Not Verified" && userData[0].email.email === xs(email)){
                        //update email to verified 
                        await user.updateOne({
                            _id: {$eq: xs(id)}, 
                            "email.id": {$eq: xs(emailID)}
                        }, {$set: {"email.status": 'Verified'}}).then( async () => {
                            return res.send({
                                status: true, 
                                txt: 'Email Successfully Verified', 
                                msg: 'You can now close this tab'
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            txt: 'Email Verification Not Found', 
                            msg: 'Please check your email / the link and try again'
                        })
                    }
                } else {
                    return res.send({
                        status: false, 
                        txt: 'Incorrect Password', 
                        msg: 'Please check your password and try again'
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    txt: 'User Not Found', 
                    msg: 'Invalid User ID'
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
//remove email 
router.post('/account/settings/email/remove-email/', normal_limit, isloggedin, async (req, res) => {
    const {id} = req.body 
    const {myid} = req.session
    try {
        await user.find({
            _id: {$eq: xs(myid)}, 
            "email.id": {$eq: xs(id)}
        }, {email: 1}).then( async (user_email) => {
            if(user_email.length > 0){
                await user.updateOne({
                    _id: {$eq: xs(myid)}, 
                }, {$set: {email: {}}}).then( () => {
                    return res.send({
                        status: true, 
                        txt: 'Email Successfully Removed', 
                        msg: 'But we suggest to add email to your account for security'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: 'Email ID not found', 
                    msg: 'Please refresh you browser'
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
//change username 
router.post('/account/settings/username/change-username/', normal_limit, isloggedin, async (req, res) => {
    const {nuname, pass} = req.body
    const {myid} = req.session
    try {
        await user.find({_id: {$eq: xs(myid)}}, {password: 1, username: 1}).then( async (usp) => {
            if(usp.length > 0){
                if(await compareHash(xs(pass), usp[0].password)){
                    if(xs(nuname) !== usp[0].username){
                        await user.find({_id: {$ne: xs(myid)}, username: xs(nuname)}, {_id: 1}).then( async (usr) => {
                            if(usr.length === 0){
                                await user.updateOne({_id: {$eq: xs(myid)}}, {$set: {username: xs(nuname)}}).then( () => {
                                    return res.send({
                                        status: true, 
                                        txt: 'Username Successfully Changed', 
                                        msg: 'You can now login with your new username'
                                    })
                                }).catch( (e) => {
                                    throw new Error(e)
                                })
                            } else {
                                return res.send({
                                    status: false, 
                                    txt: 'Username is already taken', 
                                    msg: 'Please use another username'
                                })
                            }
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            txt: 'You already use this Username', 
                            msg: 'Please use another username and try again'
                        })
                    }
                } else {
                    return res.send({
                        status: false, 
                        txt: 'Incorrect Password', 
                        msg: 'Please check your password and try again'
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    txt: 'User ID not found', 
                    msg: 'Please refresh your browser'
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
//change password 
router.post('/account/settings/password/change-password/', normal_limit, isloggedin, async (req, res) => {
    const {cpass, pass1, pass2} = req.body 
    const {myid} = req.session 
    try {
        if(xs(pass1) === xs(pass2)){
            if(xs(pass1).length > 8){
                await user.find({_id: {$eq: xs(myid)}}, {password: 1}).then( async (u_pass) => {
                    if(u_pass.length > 0){
                        if(await compareHash(xs(cpass), u_pass[0].password)){
                            const new_pass = await hash(xs(pass1), 10) 
                            await user.updateOne({_id: {$eq: xs(myid)}}, {$set: {password: new_pass}}).then( () => {
                                return res.send({
                                    status: true, 
                                    txt: 'Password Succcessfully Changed', 
                                    msg: 'You can now login with your new password'
                                })
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        } else {
                            return res.send({
                                status: false, 
                                txt: 'Incorrect Password', 
                                msg: 'Your current password is incorrect'
                            })
                        }
                    } else {
                        return res.send({
                            status: false, 
                            txt: 'User ID not found', 
                            msg: 'Please refresh your browser'
                        })
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: 'Password is too short', 
                    msg: 'Password must be 8 characters long'
                })
            }
        } else {
            return res.send({
                status: false, 
                txt: 'Password Not Match', 
                msg: 'Please check your new password '
            })
        }
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
module.exports = router
