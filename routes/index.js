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
const conversations = require('../models/conversations')
const { authenticated, isadmin, isloggedin, send_verification_email, verify_device} = require('./auth')
const { toUppercase, hash, course, year, partylists, positions, user_data, mycourse, myyear, myposition, compareHash, newNotification, newAdminNotification, valid_vote, count_vote, sy} = require('./functions')
const { normal_limit, limit} = require('./rate-limit')
const { v4: uuidv4 } = require('uuid')
const objectid = require('mongodb').ObjectID
const nl2br = require("nl2br")
const img2base64 = require('image-to-base64')
const base642img = require('base64-to-image')
const path = require('path')
const fs = require('fs-extra')
const moment = require('moment-timezone')
const uaParser = require('ua-parser-js')
const emailValidator = require('is-email')
const jimp = require('jimp')
const {load, identifyface, checkface} = require('../routes/face-api/faceRecognition')
//profile 
router.get('/home/profile/:id/', normal_limit, isloggedin, async (req, res) => {
    const {id} = req.params 
    const {myid} = req.session
    try {
        if(id == myid.toString()){
            return res.render('profile/profile', {
                profile: true,
                userData: await user_data(id), 
                data: {
                    courses: await course(), 
                    year: await year()
                }, 
                csrf: req.csrfToken()
            })
        } else {
            const userData = await user_data(id)
            if(userData){
                await user.updateOne({_id: {$eq: xs(id)}}, {$pull: {visitors: {$eq: xs(myid.toString())}}}).then( async (pl) => {
                    await user.updateOne({_id: {$eq: xs(id)}}, {$push: {visitors: {$eq: xs(myid.toString())}}}).then( async (ps) => {
                        return res.render('profile/profile', {
                            profile: false,
                            userData: userData, 
                            data: {
                                courses: await course(), 
                                year: await year()
                            }, 
                            csrf: req.csrfToken()
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.status(404).render('error/404')
            }
        }

    } catch (e) {
        return res.status(500).render('error/500')
    }
}) 
//upload cover photo 
router.post('/home/profile/:id/change-cover-photo/', limit, isloggedin, async (req, res) => {
    const {coverPhoto} = req.files
    const {myid} = req.session
    try {
        //check if user exists 
        await user.find({_id: {$eq: xs(myid)}}).then( async (userData) => {
            if(userData.length > 0) {
                //ensure that file exists 
                if(await fs.pathExists(coverPhoto[0].path)){
                    await img2base64(coverPhoto[0].path).then( async (fl_res) => {
                        await user.updateOne({_id: {$eq: xs(myid)}}, {$set: {"photo.cover": fl_res}}).then( () => {
                            return res.send({
                                status: true, 
                                msg: "Successfully Uploaded"
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    }).catch( () => {
                        return res.send({
                            status: false, 
                            msg: "Invalid Image Type"
                        })
                    })
                } else {
                    throw new Error('unknown')
                }
            } else {
                return res.send({
                    status: false, 
                    msg: "User Not Found"
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//upload profile photo 
router.post('/home/profile/:id/change-profile-photo/', limit, isloggedin, async (req, res) => {
    const {profilePhoto} = req.files
    const {myid} = req.session
    try {
        //check if user exists 
        await user.find({_id: {$eq: xs(myid)}}).then( async (userData) => {
            if(userData.length > 0) {
                //ensure that file exists 
                if(await fs.pathExists(profilePhoto[0].path)){
                    await img2base64(profilePhoto[0].path).then( async (fl_res) => {
                        await user.updateOne({_id: {$eq: xs(myid)}}, {$set: {"photo.profile": fl_res}}).then( () => {
                            return res.send({
                                status: true, 
                                msg: "Successfully Uploaded"
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    }).catch( () => {
                        return res.send({
                            status: false, 
                            msg: "Invalid File Type"
                        })
                    })
                } else {
                    throw new Error('unknown')
                }
            } else {
                return res.send({
                    status: false, 
                    msg: "User Not Found"
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
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
    const {myid, device, chat} = req.session
    const {elections, devices, facial} = await user_data(myid)
    !facial.image ? req.session.need_facial = true : req.session.need_facial = false
    const {need_facial} = req.session
    let electionsJoined = []
    try {
        let device_verified
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === device){
                device_verified = devices[i]
                break
            }
        }
        //check chat status 
        await conversations.find({
            $and: [
                {"userIDs.id": {$eq: xs(chat)}}, 
                {"userIDs.id": {$eq: xs(myid).toString()}}
            ]
        }).then( (chat_status) => {
            if(chat_status.length === 0){
                delete req.session.chat
            }
        }).catch( (e) => {
            throw new Error(e)
        })
        if(device_verified.verified){
            await user.updateOne({
                _id: {$eq: xs(myid)}, 
                devices: {$elemMatch: {id: xs(device)}}
            }, {$set: {"devices.$.ip": req.clientIp, "devices.$.last_seen": moment().tz("Asia/Manila").format()}}).then( async (u) => {
                //check if the user joined any election 
                if(elections.length > 0){
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
                        displayresults: false,
                        need_facial: need_facial,
                        elections: electionsJoined, 
                        data: {
                            positions: await positions(), 
                            partylists: await partylists(), 
                            course: await course(), 
                            year: await  year()
                        }, 
                        device: device_verified,
                        userData: await user_data(myid), 
                        conversations: {
                            ischat: chat ? true : false, 
                            kachat: chat ? await user_data(chat) : {}, 
                            userid: xs(myid).toString()
                        },
                        csrf: req.csrfToken()
                    })
                } else {
                    return res.render('index', {
                        joined: false,
                        iscandidate: false,
                        isvoting: false,
                        displayresults: false,
                        need_facial: need_facial,
                        elections: electionsJoined, 
                        data: {
                            positions: await positions(), 
                            partylists: await partylists(), 
                            course: await course(), 
                            year: await  year()
                        }, 
                        device: device_verified,
                        userData: await user_data(myid), 
                        conversations: {
                            ischat: chat ? true : false, 
                            kachat: chat ? await user_data(chat) : {}, 
                        },
                        csrf: req.csrfToken()
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            //check if the user joined any election 
            if(elections.length > 0){
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
                    displayresults: false,
                    need_facial: need_facial,
                    elections: electionsJoined, 
                    data: {
                        positions: await positions(), 
                        partylists: await partylists(), 
                        course: await course(), 
                        year: await  year()
                    }, 
                    conversations: {
                        ischat: chat ? true : false, 
                        kachat: chat ? await user_data(chat) : {}, 
                        userid: xs(myid).toString()
                    },
                    device: device_verified,
                    userData: await user_data(myid), 
                    csrf: req.csrfToken()
                })
            } else {
                return res.render('index', {
                    joined: false,
                    iscandidate: false,
                    isvoting: false,
                    displayresults: false,
                    need_facial: need_facial,
                    elections: electionsJoined, 
                    data: {
                        positions: await positions(), 
                        partylists: await partylists(), 
                        course: await course(), 
                        year: await  year()
                    }, 
                    conversations: {
                        ischat: chat ? true : false, 
                        kachat: chat ? await user_data(chat) : {}, 
                        userid: xs(myid).toString()
                    },
                    device: device_verified,
                    userData: await user_data(myid), 
                    csrf: req.csrfToken()
                })
            }
        }
    } catch (e) {
        req.session.destroy()
        return res.redirect('/')
    }
})
router.get('/home/logout/', normal_limit, (req, res) => {
    req.session.destroy()
    return res.redirect('/')
})
// verify student id
router.post('/verify', normal_limit, async (req, res) => {
    const { id } = req.body
    try {
        await data.find({ "voterId.enabled": { $eq: false }, "voterId.student_id": { $eq: xs(id).toUpperCase() } }).then((res_id) => {
            return res.send({
                isvalid: res_id.length === 0 ? false : true,
                id: xs(id).toUpperCase(),
                msg: res_id.length === 0 ? "Student ID not found" : "Student ID is valid"
            })
        }).catch((e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
router.post('/login', limit, async (req, res) => {
    const { auth_usr, auth_pass } = req.body
    const ua = xs(req.headers['user-agent'])
    const device = {
        id: uuidv4(),
        browser: `${uaParser(ua).browser.name} Browser on ${uaParser(ua).os.name}`, 
        devicename: `${uaParser(ua).device.vendor} ${uaParser(ua).device.model}`, 
        os: `${uaParser(ua).os.name} ${uaParser(ua).os.version}`,
        ip: req.clientIp,
        status: 'Online',
        last_seen: moment().tz("Asia/Manila").format(),
        verified: false
    }
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
                ]}, {password: 1, firstname: 1, facial: 1}).then( async (usp) => {
                    if(usp.length > 0){
                        if(await compareHash(xs(auth_pass), usp[0].password)){
                            //get all saved devices with this account 
                            await user.find({_id: {$eq: xs(usp[0]._id)}}, {devices: 1}).then( async (user_devices) => {
                                if(user_devices.length > 0){
                                    //if not empty check if the device is verified 
                                    let device_data 
                                    for(let i = 0; i < user_devices[0].devices.length; i++){
                                        if(user_devices[0].devices[i].browser === device.browser && user_devices[0].devices[i].devicename === device.devicename && user_devices[0].devices[i].os === device.os){
                                            device_data = user_devices[0].devices[i]
                                            break
                                        }
                                    }
                                    //if device was found 
                                    if(device_data){
                                        if(await sy() === (await user_data(usp[0]._id)).sy){
                                            req.session.device = device_data.id
                                            req.session.islogin = true // determine if logged
                                            req.session.user_type = "Voter" // user type
                                            req.session.myid = usp[0]._id // user id
                                            req.session.data = await user_data(usp[0]._id)
                                            req.session.need_facial = usp[0].facial.image ? false : true
                                            return res.send({
                                                islogin: true,
                                                msg: "Welcome " + usp[0].firstname
                                            })
                                        } else {
                                            return res.send({
                                                islogin: false,
                                                msg: "Invalid School Year"
                                            })
                                        }
                                    } else {
                                        if(await sy() === (await user_data(usp[0]._id)).sy){
                                            await user.updateOne({_id: {$eq: xs(usp[0]._id)}}, {$push: {devices: device}}).then( async (new_d) => {
                                                req.session.device = device.id
                                                req.session.islogin = true // determine if logged
                                                req.session.user_type = "Voter" // user type
                                                req.session.myid = usp[0]._id // user id
                                                req.session.data = await user_data(usp[0]._id)
                                                return res.send({
                                                    islogin: true,
                                                    msg: "Welcome " + usp[0].firstname
                                                })
                                            }).catch( (e) => {
                                                throw new Error(e)
                                            })
                                        } else {
                                            return res.send({
                                                islogin: false,
                                                msg: "Invalid School Year"
                                            })
                                        }
                                    }
                                } else {
                                    if(await sy() === (await user_data(usp[0]._id)).sy){
                                        // save new device 
                                        await user.updateOne({_id: {$eq: xs(usp[0]._id)}}, {$push: {devices: device}}).then( async (new_d) => {
                                            req.session.device = {
                                                id: device.id, 
                                                verified: device.verified
                                            }
                                            req.session.islogin = true // determine if lodevice.verifiedgged
                                            req.session.user_type = "Voter" // user type
                                            req.session.myid = usp[0]._id // user id
                                            req.session.data = await user_data(usp[0]._id)
                                            return res.send({
                                                islogin: true,
                                                msg: "Welcome " + usp[0].firstname
                                            })
                                        }).catch( (e) => {
                                            throw new Error(e)
                                        })
                                    } else {
                                        return res.send({
                                            islogin: false,
                                            msg: "Invalid School Year"
                                        })
                                    }
                                }
                            }).catch( (e) => {
                                throw new Error(e)
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
        return res.status(500).send()
    }
})
//register
router.post('/register', normal_limit, async (req, res) => {
    const { student_id, fname, mname, lname, course, yr, usr, pass } = req.body
    const hash_password = await bcrypt.hash(xs(pass), 10)
    const ua = xs(req.headers['user-agent'])
    const device = {
        id: uuidv4(),
        browser: `${uaParser(ua).browser.name} Browser on ${uaParser(ua).os.name}`, 
        devicename: `${uaParser(ua).device.vendor} ${uaParser(ua).device.model}`, 
        os: `${uaParser(ua).os.name} ${uaParser(ua).os.version}`,
        ip: req.clientIp,
        last_seen: moment().tz("Asia/Manila").format(),
        status: 'Online',
        verified: false
    }
    const newfullname = `${xs(fname.toLowerCase()).replace(/\s+/g, ' ').trim()} ${xs(mname.toLowerCase()).replace(/\s+/g, ' ').trim()} ${xs(lname.toLowerCase()).replace(/\s+/g, ' ').trim()}`
    try {
        //check name 
        await user.find({}, {firstname: 1, middlename: 1, lastname: 1}).then( async (names) => {
            if(names.length > 0){
                //check all names 
                for(let i = 0; i < names.length; i++){
                    const fullname = `${names[i].firstname.toLowerCase()} ${names[i].middlename.toLowerCase()} ${names[i].lastname.toLowerCase()}`
                    if(fullname === newfullname){
                        return res.send({
                            status: false, 
                            msg: "Invalid Name", 
                            text: "Please check your name"
                        })
                    }
                }
                //check voter id
                await data.find({
                    voterId: {$elemMatch: {student_id: {$eq: xs(student_id).toUpperCase()}}}
                }, {
                    voterId: {$elemMatch: {student_id: {$eq: xs(student_id).toUpperCase()}}}
                }).then( async (v) => {
                    if(v.length > 0){
                        const voterId = v[0].voterId[0]
                        //check if the voter is not enabled 
                        if(!voterId.enabled){
                            //check course 
                            if(voterId.course === xs(course)){
                                //check year 
                                if(voterId.year === xs(yr)){
                                    //check username if already taken 
                                    await user.find({username: {$eq: xs(usr)}}, {username: 1}).then( async (username) => {
                                        if(username.length > 0){
                                            return res.send({
                                                status: false, 
                                                msg: 'Username is already taken', 
                                                text: 'Please use another username'
                                            })
                                        } else {
                                            //save new user 
                                            await user.create({
                                                student_id: xs(student_id).toUpperCase(),
                                                firstname: xs(toUppercase(fname)).replace(/\s+/g, ' ').trim(),
                                                middlename: xs(toUppercase(mname)).replace(/\s+/g, ' ').trim(),
                                                lastname: xs(toUppercase(lname)).replace(/\s+/g, ' ').trim(),
                                                course: xs(course),
                                                year: xs(yr),
                                                socket_id: 'Offline',
                                                username: xs(usr),
                                                password: hash_password, 
                                                devices: [device], 
                                                sy: await sy()
                                            }).then(async (new_user) => {
                                                const userData = await user_data(new_user._id)
                                                req.session.device = device.id
                                                req.session.myid = userData._id //session for student
                                                req.session.islogin = true // to determine that user is now logged in
                                                req.session.user_type = "Voter" //to determine the user type
                                                req.session.data = userData
                                                req.session.need_facial = true
                                                await data.updateOne({ "voterId.student_id": { $eq: xs(student_id) } }, { $set: { "voterId.$.enabled": true } }).then( async () => {
                                                    await newNotification(userData._id, 'account', {
                                                        id: uuidv4(), 
                                                        content: `Hi, ${xs(toUppercase(fname))} Welcome to WMSU-AESU Online Voting System`,
                                                        student_id: student_id,
                                                        created: moment().tz("Asia/Manila").format()
                                                    })
                                                    return res.send({
                                                        islogin: true,
                                                        msg: `Welcome ${xs(toUppercase(fname))}`
                                                    })
                                                }).catch((e) => {
                                                    throw new Error(e)
                                                })
                                            }).catch( (e) => {
                                                throw new Error(e)
                                            })
                                        }
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                } else {
                                    return res.send({
                                        status: false, 
                                        msg: 'Invalid Year', 
                                        text: 'Please make sure that your year is match with your Voter ID'
                                    })
                                }
                            } else {
                                return res.send({
                                    status: false, 
                                    msg: 'Invalid Course', 
                                    text: 'Please make sure that your course is match with your Voter ID'
                                })
                            }
                        } else {
                            return res.send({
                                status: false, 
                                msg: 'Student Id is already taken', 
                                text: 'Please make sure that this Voter ID is belongs to you'
                            })
                        }
                    } else {
                        return res.send({
                            status: false, 
                            msg: 'Voter Id not found', 
                            text: 'Please check your Voter ID'
                        })
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                //check voter id
                await data.find({
                    voterId: {$elemMatch: {student_id: {$eq: xs(student_id).toUpperCase()}}}
                }, {
                    voterId: {$elemMatch: {student_id: {$eq: xs(student_id).toUpperCase()}}}
                }).then( async (v) => {
                    if(v.length > 0){
                        const voterId = v[0].voterId[0]
                        //check if the voter is not enabled 
                        if(!voterId.enabled){
                            //check course 
                            if(voterId.course === xs(course)){
                                //check year 
                                if(voterId.year === xs(yr)){
                                    //check username if already taken 
                                    await user.find({username: {$eq: xs(usr)}}, {username: 1}).then( async (username) => {
                                        if(username.length > 0){
                                            return res.send({
                                                status: false, 
                                                msg: 'Username is already taken', 
                                                text: 'Please use another username'
                                            })
                                        } else {
                                            //save new user 
                                            await user.create({
                                                student_id: xs(student_id).toUpperCase(),
                                                firstname: xs(toUppercase(fname)).replace(/\s+/g, ' ').trim(),
                                                middlename: xs(toUppercase(mname)).replace(/\s+/g, ' ').trim(),
                                                lastname: xs(toUppercase(lname)).replace(/\s+/g, ' ').trim(),
                                                course: xs(course),
                                                year: xs(yr),
                                                socket_id: 'Offline',
                                                username: xs(usr),
                                                password: hash_password, 
                                                devices: [device]
                                            }).then(async (new_user) => {
                                                const userData = await user_data(new_user._id)
                                                req.session.device = device.id
                                                req.session.myid = userData._id //session for student
                                                req.session.islogin = true // to determine that user is now logged in
                                                req.session.user_type = "Voter" //to determine the user type
                                                req.session.data = userData
                                                await data.updateOne({ "voterId.student_id": { $eq: xs(student_id) } }, { $set: { "voterId.$.enabled": true } }).then( async () => {
                                                    await newNotification(userData._id, 'account', {
                                                        id: uuidv4(), 
                                                        content: `Hi, ${xs(toUppercase(fname))} Welcome to WMSU-AESU Online Voting System`,
                                                        student_id: student_id,
                                                        created: moment().tz("Asia/Manila").format()
                                                    })
                                                    return res.send({
                                                        islogin: true,
                                                        msg: `Welcome ${xs(toUppercase(fname))}`
                                                    })
                                                }).catch((e) => {
                                                    throw new Error(e)
                                                })
                                            }).catch( (e) => {
                                                throw new Error(e)
                                            })
                                        }
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                } else {
                                    return res.send({
                                        status: false, 
                                        msg: 'Invalid Year', 
                                        text: 'Please make sure that your year is match with your Voter ID'
                                    })
                                }
                            } else {
                                return res.send({
                                    status: false, 
                                    msg: 'Invalid Course', 
                                    text: 'Please make sure that your course is match with your Voter ID'
                                })
                            }
                        } else {
                            return res.send({
                                status: false, 
                                msg: 'Student Id is already taken', 
                                text: 'Please make sure that this Voter ID is belongs to you'
                            })
                        }
                    } else {
                        return res.send({
                            status: false, 
                            msg: 'Voter Id not found', 
                            text: 'Please check your Voter ID'
                        })
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
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
        isvoted: false,
        facial: false,
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
                                    }, {$push: {elections: xs(electionData.id)}}).then( async () => {
                                        await newAdminNotification('election', {
                                            id: uuidv4(), 
                                            type: 'info',
                                            link: `/control/elections/id/${electionData.id}/home/voters/`,
                                            content: `${firstname} ${middlename} ${lastname} was joined the ${electionData.title}`, 
                                            created: moment().tz("Asia/Manila").format()
                                        })
                                        //add new notification to admin 
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
        }, {voters: 1, election_title: 1}).then( async (v) => {
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
                    }, {$pull: {elections: xs(electionID)}}).then( async () => {
                        await newAdminNotification('election', {
                            id: uuidv4(), 
                            type: 'warning',
                            link: `/control/elections/id/${electionID}/home/voters/`,
                            content: `${data.firstname} ${data.middlename} ${data.lastname} was left the ${v[0].election_title}`, 
                            created: moment().tz("Asia/Manila").format()
                        })
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
        //check election if exists & the user is a voter of the election
        await election.find({
            _id: {$eq: xs(electionID)},
            $and: [
                {"voters.id": {$eq: xs(myid)}}, 
                {"voters.status": "Accepted"}
            ]
        }, {candidates: 1, autoAccept_candidates: 1, status: 1, election_title: 1}).then( async (elec) => {
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
                        }, {$push: {candidates: new_candidate}}).then( async () => {
                            await newAdminNotification('election', {
                                id: uuidv4(), 
                                type: 'info',
                                link: `/control/elections/id/${electionID}/home/candidates/`,
                                content: `${data.firstname} ${data.middlename} ${data.lastname} submitted a candidacy for ${elec[0].election_title}`, 
                                created: moment().tz("Asia/Manila").format()
                            })
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
    const {electionID, myid} = req.session
    const {firstname, middlename, lastname} = await user_data(myid)
    try {
        //check if candidate & election is exists 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            candidates: {$elemMatch: {id: xs(candidateID)}}
        }, {candidates: {$elemMatch: {id: xs(candidateID)}}, election_title: 1}).then( async (ca) => {
            //if candidate is found 
            if(ca.length !== 0){
                //pull the candidate in election 
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {$pull: {candidates: {id: xs(candidateID)}}}).then( async () => {
                    await newAdminNotification('election', {
                        id: uuidv4(), 
                        type: 'warning',
                        link: `/control/elections/id/${electionID}/home/candidates/`,
                        content: `${firstname} ${middlename} ${lastname} submitted a candidacy for ${ca[0].election_title}`, 
                        created: moment().tz("Asia/Manila").format()
                    })
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
    const {myid, device, chat} = req.session 
    const {student_id, devices, facial} = await user_data(myid)
    !facial.image ? req.session.need_facial = true : req.session.need_facial = false
    const {need_facial} = req.session
    try {
        let device_data
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === device){
                device_data = devices[i]
                break
            }
        }
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
                    need_facial: need_facial,
                    displayresults: false,
                    elections: elec[0],
                    data: {
                        positions: await positions(), 
                        partylists: await partylists(), 
                        course: await course(), 
                        year: await  year()
                    }, 
                    conversations: {
                        ischat: chat ? true : false, 
                        kachat: chat ? await user_data(chat) : {}, 
                        userid: xs(myid).toString()
                    },
                    device: device_data,
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
    const {electionID, myid, device, chat} = req.session 
    const {_id, student_id, devices, facial} = await user_data(myid)
    !facial.image ? req.session.need_facial = true : req.session.need_facial = false
    const {need_facial} = req.session
    let candidateAccepted = []
    try {
        await election.find({
            _id: {$eq: xs(electionID)}, 
            $and: [
                {"voters.id": {$eq: xs(_id).toString()}}, 
                {"voters.status": "Accepted"}
            ]
        }).then( async (is_accepted) => {
            if(is_accepted.length > 0){
                let device_data
                for(let i = 0; i < devices.length; i++){
                    if(devices[i].id === device){
                        device_data = devices[i]
                        break
                    }
                }
                //check if election & voter is exists 
                await election.find({
                    _id: {$eq: xs(electionID)}, 
                    voters: {$elemMatch: {student_id: xs(student_id)}}
                }, {passcode: 0}).sort({"candidates.fullname": 1}).then( async (elec) => {
                    if(elec.length > 0){
                        for(let i = 0; i < elec[0].candidates.length; i++){
                            if(elec[0].candidates[i].status === "Accepted"){
                                candidateAccepted.push(elec[0].candidates[i])
                            }
                        }
                        return res.render('index', {
                            joined: true,
                            iscandidate: true,
                            isvoting: false,
                            displayresults: false,
                            need_facial: need_facial,
                            elections: elec[0], 
                            data: {
                                course: await course(), 
                                year: await year(), 
                                partylists: await partylists(), 
                                positions: await positions(),
                            }, 
                            conversations: {
                                ischat: chat ? true : false, 
                                kachat: chat ? await user_data(chat) : {}, 
                                userid: xs(myid).toString()
                            },
                            device: device_data,
                            userData: await user_data(myid), 
                            csrf: req.csrfToken()
                        })
                    } else {
                        return res.render('index', {
                            joined: true,
                            iscandidate: true,
                            isvoting: false,
                            displayresults: false,
                            need_facial: need_facial,
                            elections: {
                                positions: [], 
                                candidates: []
                            }, 
                            data: {
                                course: await course(), 
                                year: await year(), 
                                partylists: await partylists(), 
                                positions: await positions(),
                            }, 
                            conversations: {
                                ischat: chat ? true : false, 
                                kachat: chat ? await user_data(chat) : {}, 
                                userid: xs(myid).toString()
                            },
                            device: device_data,
                            userData: await user_data(myid), 
                            csrf: req.csrfToken()
                        })
                    }   
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.redirect(`/home/election/id/${electionID}/`)
            }
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
                            msg: 'Your Reaction Successfully Removed'
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
    const {electionID, myid, device, chat} = req.session 
    const {devices, facial} = await user_data(myid)
    !facial.image ? req.session.need_facial = true : req.session.need_facial = false
    const {need_facial} = req.session
    try {
        let device_data
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === device){
                device_data = devices[i]
                break
            }
        }
        //get election details 
        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}
        }, {voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}, passcode: 0}).then( async (elec) => {
            if(elec.length > 0){
                //check if election started 
                if(elec[0].status === "Started"){
                    if(elec[0].voters[0].isvoted){
                        return res.status(403).send()
                    } else {
                        return res.render('index', {
                            elections: elec[0],
                            joined: true,
                            isvoting: true,
                            iscandidate: false,
                            displayresults: false,
                            need_facial: need_facial,
                            data: {
                                positions: await positions(), 
                                partylists: await partylists(), 
                                course: await course(), 
                                year: await year()
                            }, 
                            conversations: {
                                ischat: chat ? true : false, 
                                kachat: chat ? await user_data(chat) : {}, 
                                userid: xs(myid).toString()
                            },
                            device: device_data,
                            userData: await user_data(myid),
                            csrf: req.csrfToken()
                        })
                    }
                } else {
                    return res.status(403).send()
                }
            } else {
                return res.status(404).render('error/404')
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//submit vote 
router.post('/home/election/id/*/vote/submit-vote/', normal_limit, isloggedin, async (req, res) => {
    const {votes} = req.body
    const {electionID, myid, voter_facial} = req.session
    const {firstname, middlename, lastname} = await user_data(myid)
    try {
        if(voter_facial){
            if(votes !== undefined && votes instanceof Array) {
                await election.find({_id: {$eq: xs(electionID)}}, {positions: 1, candidates: 1, election_title: 1}).then( async (electionData) => {
                    if(electionData.length > 0){
                        //check votes if valid
                        for(let i = 0; i < electionData[0].positions.length; i++){
                            //count votes using the current position
                            if(!count_vote(electionData[0].positions[i], votes)){
                                return res.send({
                                    status: false, 
                                    txt: "Invalid Vote", 
                                    msg: `Please select up to ${parseInt(electionData[0].positions[i].maxvote)} candidate for ${await myposition(electionData[0].positions[i].id)}`
                                }) 
                            }
                        }
                        //check if the voter already voted  
                        await election.find({
                            _id: {$eq: xs(electionID)}, 
                            voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}
                        }, {voters: {$elemMatch: {id: {$eq: xs(myid).toString()}}}
                        }).then( async (elecData) => {
                            if(elecData.length > 0){
                                //check if voted or not 
                                if(elecData[0].voters[0].isvoted){
                                    return res.send({
                                        status: false,
                                        txt: "Oops..", 
                                        msg: `You already submitted a vote`
                                    })
                                } else {
                                    for(let v = 0; v < votes.length; v++){
                                        await election.updateOne({
                                            _id: {$eq: xs(electionID)}, 
                                            "candidates.id": {$eq: xs(JSON.parse(votes[v]).candidateID)}
                                        }, {$push: {"candidates.$.votes": xs(myid).toString()}}).then( async () => {
                                            //save candidate id in the voter votes
                                            await election.updateOne({
                                                _id: {$eq: xs(electionID)},
                                                "voters.id": xs(myid).toString()
                                            }, {
                                                $push: {"voters.$.voted": xs(JSON.parse(votes[v]).candidateID)}, 
                                                $set: {"voters.$.isvoted": true}
                                            }).catch( (e) => {
                                                throw new Error(e)
                                            })
                                        }).catch( (e) => {
                                            throw new Error(e)
                                        })
                                    }
                                    //send response
                                    await newAdminNotification('election', {
                                        id: uuidv4(), 
                                        type: 'info',
                                        link: `/control/elections/id/${electionID}/home/candidates/`,
                                        content: `${firstname} ${middlename} ${lastname} submitted a candidacy for ${electionData[0].election_title}`, 
                                        created: moment().tz("Asia/Manila").format()
                                    })
                                    //update voter facial
                                    await election.updateOne({
                                        _id: {$eq: xs(electionID)}, 
                                        "voters.id": {$eq: xs(myid.toString())}
                                    }, {$set: {"voters.$.facial": true}}).then( () => {
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
                                    txt: "Voter Not Found", 
                                    msg: "Please refresh the app"
                                })
                            }
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            txt: "Election Not Found", 
                            msg: "Please refresh the app"
                        })
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: "Invalid Vote", 
                    msg: "Please select a candidate in each position"
                })
            }
        } else {
            return res.status(403).send()
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//election results 
router.get('/home/election/id/*/results/', normal_limit, isloggedin, async (req, res) => {
    const {electionID, myid, device, chat} = req.session 
    const {devices, facial} = await user_data(myid)
    !facial.image ? req.session.need_facial = true : req.session.need_facial = false
    const {need_facial} = req.session
    try {
        let device_data
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === device){
                device_data = devices[i]
                break
            }
        }

        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {id: {$eq: xs(myid)}}}
        },{voters: {$elemMatch: {id: {$eq: xs(myid)}}}, passcode: 0}).then( async (elec_voter) => {
            if(elec_voter.length > 0){
                if(elec_voter[0].voters[0].isvoted){
                    return res.render('index', {
                        elections: elec_voter[0],
                        joined: true,
                        isvoting: false,
                        iscandidate: false,
                        displayresults: true,
                        need_facial: need_facial,
                        data: {
                            positions: await positions(), 
                            partylists: await partylists(), 
                            course: await course(), 
                            year: await year()
                        }, 
                        conversations: {
                            ischat: chat ? true : false, 
                            kachat: chat ? await user_data(chat) : {}, 
                            userid: xs(myid).toString()
                        },
                        device: device_data,
                        userData: await user_data(myid),
                        csrf: req.csrfToken()
                    })
                } else {
                    return res.redirect(`/home/election/id/${electionID}/vote/`)
                }
            } else {
                return res.redirect('/home')
            }
        }).catch( (e) => {
            throw new Error(e)
        })        
    } catch (e) {
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
                                                    txt: "Email Verification Sent Successfully",
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
        return res.status(500).send()
    }
})
//confirm email
router.post('/account/settings/verify-email/:email/:emailID/:id/', normal_limit, async (req, res) => {
    const {pass} = req.body
    const {email, emailID, id} = req.params
    try {
        await user.find({_id: {$eq: xs(id)}}, {email: 1, password: 1, firstname: 1, student_id: 1, _id: 1}).then( async (userData) => {
            if(userData.length > 0){
                //check password 
                if(await compareHash(xs(pass), userData[0].password)){
                    if(userData[0].email.id === xs(emailID) && userData[0].email.status === "Not Verified" && userData[0].email.email === xs(email)){
                        //update email to verified 
                        await user.updateOne({
                            _id: {$eq: xs(id)}, 
                            "email.id": {$eq: xs(emailID)}
                        }, {$set: {"email.status": 'Verified'}}).then( async () => {
                            await newNotification(userData[0]._id, 'account', {
                                id: uuidv4(), 
                                content: `Hi, ${userData[0].firstname} Thank you for verifying your email`,
                                student_id: userData[0].student_id,
                                created: moment().tz("Asia/Manila").format()
                            })
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
        return res.status(500).send()
    }
})
//change email 
router.post('/account/settings/email/change-email/', normal_limit, isloggedin, async (req, res) => {
    const {myid} = req.session 
    try {
        //delete email 
        await user.updateOne({
            _id: {$eq: xs(myid)}
        }, {$set: {email: {}}}).then( (k) => {
            return res.send({
                status: true, 
                txt: "You can now change your email",
                msg: ""
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
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
        return res.status(500).send()
    }
})
//add email in secure page 
router.post('/account/settings/secure/add-email/', normal_limit, isloggedin, async (req, res) => {
    const {nmail, pass} = req.body 
    const {myid} = req.session
    const {firstname} = await user_data(myid)
    try {
        //check if valid email
       if(emailValidator(xs(nmail))){
           //check if email is not used by another user 
           await user.find({"email.email": {$eq: xs(nmail)}}).then( async (em_not_use) => {
               if(em_not_use.length === 0){
                    await user.find({_id: {$eq: xs(myid)}}, {password: 1, email: 1}).then( async (user_pass) => {
                        if(user_pass.length > 0){
                            //check password
                            if(await compareHash(xs(pass), user_pass[0].password)){
                                //check email  
                                if(xs(nmail) !== user_pass[0].email.email){
                                    //check if the email is not used by another user 
                                    await user.find({
                                        _id: {$eq: xs(myid)}, 
                                        "email.email": {$eq: xs(nmail)}
                                    }).then( async (mail) => {
                                        if(mail.length > 0){
                                            return res.send({
                                                status: false, 
                                                txt: 'Email already in used', 
                                                msg: 'Please submit another email'
                                            })
                                        } else {
                                            const email_id = uuidv4()
                                            await user.updateOne({
                                                _id: { $eq: xs(myid) }
                                            }, {
                                                $set: {
                                                    "email.id": email_id,
                                                    "email.email": xs(nmail),
                                                    "email.status": "Not Verified",
                                                    "email.added": moment().tz("Asia/Manila").format()
                                                }
                                            }).then(() => {
                                                //send verification  
                                                send_verification_email(firstname, xs(nmail), xs(myid.toString()), email_id)
                                                return res.send({
                                                    status: true,
                                                    txt: "Email Verification Sent Successfully",
                                                    msg: 'Please check your E-mail inbox'
                                                })
                                            }).catch((e) => {
                                                throw new Error(e)
                                            })
                                        }
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                } else {
                                    return res.send({
                                        status: false, 
                                        txt: 'Email already in used', 
                                        msg: 'Please submit another email'
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
               } else {
                return res.send({
                    status: false, 
                    txt: 'Email is already taken', 
                    msg: 'Please submit another email'
                })
               }
           }).catch( (e) => {
               throw new Error(e)
           })
       } else {
           return res.send({
               status: false, 
               txt: 'Invalid Email', 
               msg: 'Please submit another email'
           })
       }
    } catch (e) {
        return res.status(500).send()
    }
})
//verify user through email
router.post('/account/settings/secure/verify/', normal_limit, isloggedin, async (req, res) => {
    const {myid, device} = req.session 
    const {devices} = await user_data(myid)
    try {
        let deviceData
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === device){
                deviceData = devices[i]
                break
            }
        }
        if(deviceData){
            return res.render('account/verify', {
                userData: await user_data(myid),
                device: deviceData
            })
        } else {
            return res.status(404).send()
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//resend email verification 
router.post('/account/settings/*/resend-email-verification/', normal_limit, isloggedin, async (req, res) => {
    const {myid} = req.session 
    const {email, firstname} = await user_data(myid)
    try {
        //resend email verification 
        send_verification_email(firstname, email.email, myid.toString(), email.id)
        return res.send({
            status: true,
            txt: "Email Verification Resend Successfully",
            msg: 'Please check your Email Inbox'
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//verify device 
router.post('/account/settings/secure/verify-device/', normal_limit, isloggedin, async (req, res) => {
    const {deviceID} = req.body 
    const {myid} = req.session 
    const {firstname, devices, email} = await user_data(myid)
    try {
        let deviceData
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === xs(deviceID)){
                deviceData = devices[i]
                break
            }
        }
        if(deviceData){
            await user.updateOne({
                _id: {$eq: xs(myid)}, 
                devices: {$elemMatch: {id: xs(deviceData.id)}}
            }, {$set: {"devices.$.status": "Verifying"}}).then( () => {
                verify_device(firstname, email.email, deviceData, myid)
                return res.send({
                    status: true, 
                    txt: 'Verification Sent Successfully', 
                    msg: 'Please check your email inbox'
                })
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            return res.send({
                status: false, 
                txt: 'Device Not Found', 
                msg: 'Please refresh you browser'
            })
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//verify device by email 
router.get('/account/settings/verify-device/:deviceID/:userID/', normal_limit, async (req, res) => {
    const {deviceID, userID} = req.params
    const {devices} = await user_data(userID)
    try {
        let device_found
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === deviceID) {
                device_found = devices[i]
                break
            }
        }
        if(device_found){
            return res.render('account/settings-device-verify', {
                device: device_found,
                csrf: req.csrfToken()
            })
        } else {
            return res.status(404).render('error/404')
        }
    } catch (e) {
        res.status(500).redirect('/')
    }
})
// verify now 
router.post('/account/settings/verify-device/:deviceID/:userID/', normal_limit, async (req, res) => { 
    const {deviceID, userID} = req.params 
    const {devices, student_id, firstname, _id} = await user_data(userID)
    try {
        let device_found
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === deviceID){
                device_found = devices[i]
                break
            }
        }
        if(device_found){
            await user.updateOne({
                _id: {$eq: xs(userID)}, 
                devices: {$elemMatch: {id: device_found.id}}
            }, {$set: {
                "devices.$.status": "Online", 
                "devices.$.verified": true
            }}).then( async () => {
                await newNotification(_id, 'account', {
                    id: uuidv4(), 
                    content: `Hi, ${firstname} Thank you for verifying your new device`,
                    student_id: student_id,
                    created: moment().tz("Asia/Manila").format()
                })
                return res.send({
                    status: true, 
                    txt: 'Device Successfully Verified', 
                    msg: 'You can now close this tab'
                })
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            return res.status(404).send()
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//get notifications 
router.post('/account/notifications/', normal_limit, isloggedin, async (req, res) => {
    const {myid} = req.session 

    try {
        await user.find({_id: {$eq: xs(myid)}}, {notifications: 1}).then( async (userData) => {
            return res.render('notification/notifications-list', {
                notifications: userData.length > 0 ? userData[0].notifications : {}
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//remove notification
router.post('/account/notifications/remove/', normal_limit, isloggedin, async (req, res) => {
    const {id, type} = req.body 
    const {myid} = req.session 

    try {
        if(xs(type) === "account") {
            await user.find({_id: {$eq: xs(myid)}}, {notifications: 1}).then( async (userData) => {
                if(userData.length > 0){
                    let {account} = userData[0].notifications, nty_found = false
                    for(let i = 0; i < account.length; i++){
                        if(account[i].id === xs(id)){
                            account.splice(i, 1)
                            nty_found = true 
                            break
                        }
                    }
                    if(nty_found){
                        await user.updateOne({_id: {$eq: xs(myid)}}, {$set: {"notifications.account": account}}).then( () => {
                            return res.send({
                                status: true, 
                                txt: "Notification Successfully Removed", 
                                msg: ""
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            txt: "Notification Not Found", 
                            msg: "Please refresh the app"
                        })
                    }
                } else {
                    return res.send({
                        status: false, 
                        txt: "Notification Not Found", 
                        msg: "Please refresh the app"
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } else if (xs(type) === "election") {
            await user.find({_id: {$eq: xs(myid)}}, {notifications: 1}).then( async (userData) => {
                if(userData.length > 0){
                    let {election} = userData[0].notifications, nty_found = false
                    for(let i = 0; i < election.length; i++){
                        if(election[i].id === xs(id)){
                            election.splice(i, 1)
                            nty_found = true 
                            break
                        }
                    }
                    if(nty_found){
                        await user.updateOne({_id: {$eq: xs(myid)}}, {$set: {"notifications.election": election}}).then( () => {
                            return res.send({
                                status: true, 
                                txt: "Notification Successfully Removed", 
                                msg: ""
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            txt: "Notification Not Found", 
                            msg: "Please refresh the app"
                        })
                    }
                } else {
                    return res.send({
                        status: false, 
                        txt: "Notification Not Found", 
                        msg: "Please refresh the app"
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//get messages 
router.post('/account/messages/', normal_limit, isloggedin, async (req, res) => {
    const {myid} = req.session 
    const {student_id} = await user_data(myid)
    try {
        await conversations.find({"userIDs.id": {$eq: xs(myid)}}).then( async (userConversations) => {
            return res.render('message/messages-list', {
                messages: userConversations, 
                student_id: student_id, 
                userid: myid.toString(), 
                created: userConversations.length > 0 ? userConversations[0].created : ''
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//search user in message 
router.post('/account/messages/search-users/', normal_limit, isloggedin, async (req, res) => {
    const {search} = req.body 
    const {myid} = req.session
    let result = []
    try {
        await user.find({_id: {$ne: xs(myid)}}, {firstname: 1, middlename: 1, lastname: 1, course: 1, year: 1, socket_id: 1, _id :1, student_id: 1}).then( async (usersData) => {
            if(usersData.length > 0){
                for(let i = 0; i < usersData.length; i++){
                    const name = `${usersData[i].firstname} ${usersData[i].middlename} ${usersData[i].lastname}`
                    if(name.search(xs(search)) !== -1) {
                        result.push(usersData[i])
                    }
                }
                return res.render('message/search-user', {
                    users: result, 
                    data: {
                        courses: await course(),
                        year: await year()
                    }
                })
            } else {
                return res.render('message/search-user', {
                    users: [], 
                    data: {
                        courses: await course(),
                        year: await year()
                    }
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//begin to chat
router.post('/account/messages/begin-chat/', normal_limit, isloggedin, async (req, res) => {
    const {id} = req.body 
    const {myid} = req.session
    const myData = await user_data(myid)
    const myKachatData = await user_data(id)
    const new_convo = [
        {
            id: xs(myid).toString(), 
            student_id: myData.student_id,
            name: `${myData.firstname} ${myData.middlename} ${myData.lastname}`
        }, 
        {
            id: xs(id), 
            student_id: myKachatData.student_id,
            name: `${myKachatData.firstname} ${myKachatData.middlename} ${myKachatData.lastname}`
        }
    ]
    try {
        await conversations.find({
           $and: [
               {"userIDs.id": {$eq: xs(id)}}, 
               {"userIDs.id": {$eq: xs(myid).toString()}}
           ]
        }).then( async (convo) => {
            if(convo.length > 0){
                req.session.chat = xs(id)
                return res.render('message/conversations', {
                    kachat: await user_data(id),
                    userID: xs(myid), 
                    messages: convo[0].messages
                })
            } else {
                await conversations.create({
                    userIDs: new_convo, 
                    messages: [],
                    created: moment().tz("Asia/Manila").format()
                }).then( async (new_cnv) => {
                    req.session.chat = xs(id)
                    return res.render('message/conversations', {
                        kachat: await user_data(id),
                        userID: xs(myid), 
                        messages: new_cnv.messages
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//get conversations
router.post('/account/messages/list/', normal_limit, isloggedin, async (req, res) => {
    const {chat, myid} = req.session
    try {
        await conversations.find({
            $and: [
                {"userIDs.id": {$eq: xs(chat)}}, 
                {"userIDs.id": {$eq: xs(myid).toString()}}
            ]
        }).then( async (convo) => {
            return res.render('message/conversations-list', {
                kachat: xs(chat), 
                userid: xs(myid).toString(), 
                messages: convo[0].messages
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//close messenger 
router.post('/account/message/close/', normal_limit, isloggedin, async (req, res) => {
    delete req.session.chat 
    return res.send({status: true})
})
//register face 
router.post('/account/facial/register/', normal_limit, isloggedin, async (req, res) => {
    const {facialreg} = req.files 
    const {myid} = req.session
    const {facial} = await user_data(myid)
    try {
        if(facialreg instanceof Array){
            if(!facial.image){
                if(await load()){
                    if(await checkface(facialreg[0].path)){
                        if(await fs.pathExists(facialreg[0].path)){
                            await img2base64(facialreg[0].path).then( async (reg_file) => {
                                fs.remove(facialreg[0].path).then( async () => {
                                    await user.updateOne({_id: {$eq: xs(myid)}}, {$set: {
                                        "facial.status": false,
                                        "facial.image": reg_file
                                    }}).then( () => {
                                        delete req.session.need_facial
                                        return res.send({
                                            status: true, 
                                            txt: 'Face Successfully Registered', 
                                            msg: 'We will send you a notification once we validate your Facial Data <br><br> Redirecting...'
                                        })
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                }).catch( (e) => {
                                    throw new Error(e)
                                })
                            })
                        }
                    } else {
                        return res.send({
                            status: false, 
                            txt: 'Invalid Face Detected', 
                            msg: 'Please check your environment and make sure that your face is clear. \n Multiple Faces is not allowed'
                        })
                    }
                } else {
                    throw new Error('Failed to load face models')
                }
            } else {
                delete req.session.need_facial
                return res.send({
                    status: true, 
                    txt: 'You Already Register Your Face', 
                    msg: 'Redirecting..'
                })
            }
        } else {
            return res.send({
                status: false, 
                txt: 'Invalid Face Detected', 
                msg: 'Please check your environment and make sure that your face is clear. \n Multiple Faces is not allowed'
            })
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//verify face
router.post('/account/facial/login/', normal_limit, isloggedin, async (req, res) => { 
    const {faciallogin} = req.files 
    const {myid, electionID} = req.session
    const {student_id, facial} = await user_data(myid)
    try {
        if(faciallogin){
            if(facial){
                const buffer = Buffer.from(facial.image, "base64")
                jimp.read(buffer, (err, res) => {
                    if (err) throw new Error(err)
                    res.quality(100).write(`uploads/${student_id}.jpg`)
                })
                if(await load()){
                    const {status, match} = await identifyface(student_id, `uploads/${student_id}.jpg`, faciallogin[0].path) 
                    fs.remove(`uploads/${student_id}.jpg`).then( () => {
                        fs.remove(faciallogin[0].path).then( () => {
                            if(status){
                                if(match[0]._label === student_id){
                                    req.session.voter_facial = true
                                    return res.send({
                                        status: true, 
                                        txt: 'Face Successfully Verified', 
                                        msg: 'Submitting Votes...'
                                    })
                                } else {
                                    return res.send({
                                        status: false, 
                                        redirect: false,
                                        txt: "Can't Identify Your Face", 
                                        msg: 'Please ensure that your environment is not dark and your face is clear'
                                    })
                                }
                            } else {
                                return res.send({
                                    status: false, 
                                    redirect: false,
                                    txt: "Can't Identify Your Face", 
                                    msg: 'Please ensure that your environment is not dark and your face is clear'
                                })
                            }
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else {
                    throw new Error('failed to load face api')
                }
            } else {
                req.session.need_facial = true
                return res.send({
                    status: false, 
                    txt: 'Please Register Your Face', 
                    redirect: true,
                    msg: 'Redirecting..'
                })
            }
        } else {
            return res.send({
                status: false, 
                txt: 'Invalid Image', 
                redirect: false,
                msg: 'Please reload your browser'
            })
        }
    } catch(e) {
        return res.status(500).send()
    }
})
//get facial data 
router.post('/account/voter/facial/', normal_limit, isloggedin, async (req, res) => {
    const {myid, electionID} = req.session
    const {facial} = await user_data(myid)
    try {
        await election.find({
            _id: {$eq: xs(electionID)}, 
            voters: {$elemMatch: {id: {$eq: xs(myid.toString())}}}
        }, {voters: {$elemMatch: {id: {$eq: xs(myid.toString())}}}}).then( (elec) => {
            if(elec.length > 0){ 
                if(elec[0].voters[0].status === "Accepted"){
                    if(facial){
                        return res.send({
                            status: true,
                            txt: '', 
                            msg: ''
                        })
                    } else {
                        return res.status(403).send()
                    }
                } else {
                    return res.status(403).send()
                }
            } else {
                return res.send({
                    status: false, 
                    txt: 'Voter Not Found', 
                    msg: 'Please refresh your browser'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
module.exports = router