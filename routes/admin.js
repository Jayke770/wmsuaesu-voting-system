if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const express = require('express')
const adminrouter = express.Router()
const {isadmin} = require('./auth')
const user = require('../models/user')
const election = require('../models/election')
const data = require('../models/data')
const adminData = require('../models/admin')
const { search_limit, limit, normal_limit, delete_limit } = require('./rate-limit')
const {restore_account_email, change_account_cred} = require('./auth')
const {hash, compareHash, course, year, partylists, positions, toUppercase, mycourse, myyear, myposition, mypartylist, myprofile, color, user_data, is_course_eligible, is_year_eligible, newNotification, user_id} = require('./functions')
const genpass = require('generate-password')
const xs = require('xss')
const { v4: uuid } = require('uuid')
const objectid = require('mongodb').ObjectID
const moment = require('moment-timezone')
const nl2br = require('nl2br')
const path = require('path')
const fs = require('fs-extra')
/* request user profile image */
adminrouter.get('/profile/:id/', normal_limit, async (req, res) => {
    const {id} = req.params 
    const {islogin} = req.session 
    if(islogin){
        try {
            await user.find({
                student_id: {$eq: xs(id)}
            }, {firstname: 1, lastname: 1, photo: 1}).then( async (userData) => {
                if(userData.length > 0){ 
                    if(userData[0].photo.profile){
                        const base64profile_img = userData[0].photo.profile 
                        const base64img = Buffer.from(base64profile_img, 'base64')
                        return res.writeHead(200, {
                            'Content-Type': 'image/png',
                            'Content-Length': base64img.length
                        }).end(base64img)
                    } else {
                        const im = myprofile(color.dark(), color.light(), `${userData[0].firstname.split('')[0]}${userData[0].lastname.split('')[0]}`).split(",")[1]
                        const img = Buffer.from(im, 'base64')
                        return res.writeHead(200, {
                            'Content-Type': 'image/png',
                            'Content-Length': img.length
                        }).end(img)
                    }
                } else {
                    return res.status(404).send()
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            console.log(e)
            return res.status(500).send()
        }
    } else {
        return res.status(401).send()
    }
})
//get cover photo 
adminrouter.get('/cover/:sid/', normal_limit,  async (req, res) => {
    const {sid} = req.params 
    const {myid, islogin} = req.session 

    if(islogin) {
        try {
            await user.find({
                student_id: {$eq: xs(sid)}
            }, {photo: 1}).then( async (userData) => {
                if(userData.length > 0) {
                    if(userData[0].photo.cover){
                        const base64cover_img = userData[0].photo.cover 
                        const base64img = Buffer.from(base64cover_img, 'base64')
                        return res.writeHead(200, {
                            'Content-Type': 'image/png',
                            'Content-Length': base64img.length
                        }).end(base64img)
                    } else {
                        return res.sendFile('image.jpg', {root: "public/assets"})
                    }
                } else {
                    return res.sendFile('image.jpg', {root: "public/assets"})
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            return res.status(500).send()
        }
    } else {
        return res.status(401).send()
    }
})
/*##################################################################################### */
adminrouter.get('/control/logout/', limit, isadmin, async (req, res) => {
    req.session.destroy() 
    return res.redirect('/')
})
adminrouter.get('/control',limit, isadmin, async (req, res) => {
    //delete the current election session 
    delete req.session.currentElection 
    try {
        let elections
        //get all elections 
        await election.find({}).then( (elecs) => {
            elections = elecs
        }).catch( (e) => {
            throw new Error(e)
        })
        return res.render('control/home', {
            elections: elections, 
            csrf: req.csrfToken()
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//elections
adminrouter.get('/control/elections/', limit, isadmin, async (req, res) => {
    //delete the current election session 
    delete req.session.currentElection 
    try {
        //get all courses, positions, & partylist 
        await data.find({}, {positions: 1, course: 1, year: 1, partylists: 1}).then( async (d) => {
            return res.render("control/forms/elections", {
                positions: d.length != 0 ? d[0].positions : [], 
                course: d.length != 0 ? d[0].course : [], 
                year: d.length != 0 ? d[0].year : [], 
                partylists: d.length != 0 ? d[0].partylists : [], 
                elections: await election.countDocuments(),
                csrf: req.csrfToken()
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch(e){
        return res.status(500).send()
    }
})
//create election 
// 1 bug here in starting and ending data/time of election
adminrouter.post('/control/elections/create-election/', limit, isadmin, async (req, res) => {
    const {e_title, e_description, e_start, e_end, courses, year, positions, partylists} = req.body 
    //sanitize 
    const pass =  genpass.generate({
        length: 10,
        uppercase: false,
        numbers: true
    }) // passcode in string
    const passcode = await hash(pass, 10) // passcode in with hashing
    const title = xs(e_title)
    const description = xs(e_description)
    const start = xs(e_start)
    const end = xs(e_end)
    const crs = xs(courses).split(",")
    const yr = xs(year).split(",")
    const pos = JSON.parse(positions)
    const pty = xs(partylists).split(",")
    //use to identify the the course, year, positions, partylist is exist in db 
    let e_crs = true, 
        e_yr = true, 
        e_pos = true, 
        e_pty = true,
        e_strt = true, 
        start_time = moment(start).tz("Asia/Manila").startOf().fromNow().split(" "), 
        end_time = moment(end).tz("Asia/Manila").startOf().fromNow().split(" ")
    if(title != "" && start != "" && end != "" && crs.length != 0 && yr.length != 0 && pos.length != 0 && pty.length != 0){
        try {
            //if the partylist is less than 2
            if(pty.length < 2){
                return res.send({
                    created: false, 
                    msg: "Invalid Partylist",
                    txt: "Partylist must be more than one"
                })
            }
            /*
                remove positions, partylist, course and year checking
            */
            //check if the starting time is valid 
            if(start_time[2] === "ago" || end_time[2] === "ago"){
                e_strt = false
                return res.send({
                    created: false, 
                    msg: "Invalid Date or Time", 
                    txt: "Please check the starting and ending date or time"
                })
            }
            //if no error
            if(e_crs && e_yr && e_pos && e_pty, e_strt){
                //check the election title if the same with the other election in db 
                await election.find({election_title: {$eq: title}}, {election_title: 1}, (err, f) => {
                    if(err) throw new err 
                    if(f.length === 0){
                        //create new election  
                        election.create({
                            election_title: title, 
                            election_description: description, 
                            courses: crs, 
                            year: yr,
                            positions: pos, 
                            candidates: [], 
                            partylist: pty, 
                            voters: [], 
                            passcode: passcode, 
                            status: "Not Started", 
                            start: start, 
                            end: end, 
                            autoAccept_voters: false,
                            autoAccept_candidates: false,
                            created: moment().tz("Asia/Manila").format()
                        }, (err, crtd) => {
                            if(err) throw new err 
                            if(crtd){
                                return res.send({
                                    created: true, 
                                    msg: "Election Created Successfully", 
                                    data: {
                                        e_start: moment(start).tz("Asia/Manila").startOf().fromNow(),  
                                        passcode: pass
                                    }
                                })
                            } else {
                                return res.send({
                                    created: false, 
                                    msg: "Something went wrong", 
                                    txt: "Got error while saving to database"
                                })
                            }
                        })
                    } else {
                        return res.send({
                            created: false, 
                            msg: "Change your election title"
                        })
                    }
                })
            } else {
                return res.send({
                    created: false, 
                    msg: "Something went wrong"
                })
            }
        } catch(e) {
            console.log(e)
            return res.status(500).send()
        }
    } else {
        return res.send({
            created: false, 
            msg: "All feilds is required"
        })
    }
})
//all elections 
adminrouter.post('/control/elections/election-list/', limit, isadmin, async (req, res) => {
    //get all elections 
    try {
        await election.find({}, {passcode: 0}).then( (elecs) => {
            return res.render("control/forms/election_list", {elections: elecs, home: false})
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//all elections using chart 
adminrouter.post('/control/elections/', limit, isadmin, async (req, res) => {
    //get all elections 
    try {
        await election.find({}, {passcode: 0}).then( (elecs) => {
            return res.render("control/forms/elections_chart", {elections: elecs})
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//get elections by id
adminrouter.get('/control/elections/id/:id/:from/', limit, isadmin, async (req, res) => {
    const id = req.params.id, from = req.params.from
    let crs, yr, pos, pty, pending_v = 0, accepted_v = 0, pending_ca = 0, accepted_ca = 0, deleted_ca = 0
    try {
        await election.find({_id: {$eq: xs(id)}}).then( async (elecs) => {
            const e_data = elecs.length === 0 ? '' : elecs[0] 
            //save election id to session 
            req.session.currentElection = xs(id)
            //get all the pending & accepted voters 
            for(let i = 0; i < e_data.voters.length; i++){
                if(e_data.voters[i].status === 'Pending'){
                    pending_v += 1 
                }
                if(e_data.voters[i].status === 'Accepted'){
                    accepted_v += 1 
                }
            }
            //get all pending, accepted, deleted candidates
            for(let i = 0; i < e_data.candidates.length; i++){
                if(e_data.candidates[i].status === 'Pending'){
                    pending_ca += 1 
                }
                if(e_data.candidates[i].status === 'Accepted'){
                    accepted_ca += 1 
                }
                if(e_data.candidates[i].status === 'Deleted'){
                    deleted_ca += 1 
                }
            }
            return res.render("control/forms/election_details", {
                election: elecs.length === 0 ? '' : elecs[0], 
                data: {
                    course: await course(), 
                    year: await year(),
                    positions: await positions(),
                    partylist: await partylists(),
                },
                pending_voters: pending_v, // No. of pending_voters
                accepted_voters: accepted_v, // No. of accepted voters 
                pending_candidates: pending_ca, //No. of pending candidates
                accepted_candidates: accepted_ca, //No. of accepted candiates
                deleted_candidates: deleted_ca, //No. of deleted candiates
                endtime: moment(e_data.end).tz("Asia/Manila").fromNow(),
                link: xs(from) === "home" ? '/control/' : '/control/elections/',
                election_link: process.env.link,
                csrf: req.csrfToken()
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
}) 


//get candidates
adminrouter.get('/control/elections/id/:id/:from/candidates/', limit, isadmin, async (req, res) => {
    const {id, from} = req.params
    const {currentElection} = req.session
    try {
        if(xs(id) === xs(currentElection.toString())){
            await election.find({_id: {$eq: xs(currentElection)}}, {candidates: 1, courses :1, year: 1, positions: 1, partylist: 1, election_title: 1}).then( async (elec) => {
                return res.render('control/forms/election-candidates', {
                    election: elec.length > 0 ? elec[0] : [], 
                    data: {
                        courses: await course(), 
                        year: await year(), 
                        positions: await positions(), 
                        partylists: await partylists()
                    }, 
                    csrf: req.csrfToken(), 
                    link: `/control/elections/id/${id}/${from}/`
                })
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            return res.status(404).render('error/404')
        }
    } catch (e) {
        console.log(e) 
        return res.status(500).render('error/500')
    }
})
//search users to add candidates
adminrouter.post('/control/elections/candidates/search-users/', normal_limit, isadmin, async (req, res) => {
    const {search} = req.body 
    const {currentElection} = req.session
    let result = [] 

    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {voters: 1}).then( async (usersData) => {
            if(usersData.length > 0) {
                for(let i = 0; i < usersData[0].voters.length; i++){
                    //check if the voter is not a candidate 
                    await election.find({
                        _id: {$eq: xs(currentElection)}, 
                        "candidates.student_id": {$eq: xs(usersData[0].voters[i].student_id)}
                    }).then( (is_ca) => {
                        if(is_ca.length === 0){
                            if(xs(search)){
                                if(usersData[0].voters[i].fullname.search(xs(search)) !== -1){
                                    result.push(usersData[0].voters[i])
                                }
                            } else {
                                result.push(usersData[0].voters[i])
                            }
                        }
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                }
                return res.render('control/forms/election-list-voters', {
                    users: result
                })
            } else{
                return res.render('control/forms/election-list-voters', {
                    users: []
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
//add new candidate from voter 
adminrouter.post('/control/elections/candidates/add-voter-as-candidate/', normal_limit, isadmin, async (req, res) => {
    const {sid, pos, pty, platform} = req.body
    const {currentElection} = req.session 

    try {
        //check if the new candidate is not a candidate 
        await election.find({_id: {$eq: xs(currentElection)}, "candidates.student_id": {$eq: xs(sid)}}).then( async (is_ca) => {
            if(is_ca.length > 0) {
                return res.send({
                    status: false, 
                    txt: 'Voter is already a candidate', 
                    msg: 'Please choose another voter'
                })
            } else {
                //check partylist and position if exists in election 
                await election.find({
                    _id: {$eq: xs(currentElection)}, 
                    positions: {$elemMatch: {id: {$eq: xs(pos)}}}, 
                    partylist: {$elemMatch: {$eq: xs(pty)}}
                }).then( async (is_pp) => {
                    if(is_pp.length > 0){
                        //check if the election is not started 
                        await election.find({_id: {$eq: xs(currentElection)}}, {status: 1}).then( async (elec_status) => {
                            if(elec_status.length > 0) {
                                if(elec_status[0].status === "Not Started"){
                                    let new_candidate = {
                                        id: uuid(), 
                                        student_id: '',
                                        fullname: '', 
                                        course: '', 
                                        year: '', 
                                        partylist: xs(pty), 
                                        position: xs(pos), 
                                        platform: xs(platform),
                                        votes: [],
                                        reactions: [],
                                        views: [],
                                        status: 'Accepted', 
                                        msg: '',
                                        created: moment().tz("Asia/Manila").format()
                                    }
                                    //get voter info 
                                    await user.find({student_id: {$eq: xs(sid)}}, {firstname: 1, middlename: 1, lastname: 1, course: 1, year: 1, student_id: 1}).then( async (voterData) => {
                                        if(voterData.length > 0) {
                                            new_candidate.student_id = voterData[0].student_id 
                                            new_candidate.fullname = `${voterData[0].firstname} ${voterData[0].middlename} ${voterData[0].lastname}`
                                            new_candidate.course =  voterData[0].course
                                            new_candidate.year =  voterData[0].year 
                                            
                                            //save new candidate 
                                            await election.updateOne({_id: {$eq: xs(currentElection)}}, {$push: {candidates: new_candidate}}).then( async () => {
                                                await newNotification(voterData[0]._id, 'election', {
                                                    id: uuid(), 
                                                    type: 'info',
                                                    content: `You are now a candidate for ${await myposition(xs(pos))} in ${await mypartylist(xs(pty))}`,
                                                    created: moment().tz("Asia/Manila").format()
                                                })
                                                return res.send({
                                                    status: true, 
                                                    txt: 'Successfully added as candidate',
                                                    student_id: voterData[0].student_id, 
                                                    msg: `${new_candidate.fullname} is now a candidate`
                                                })
                                            }).catch( (e) => {
                                                throw new Error(e)
                                            })
                                        } else {
                                            return res.send({
                                                status: false, 
                                                txt: 'User information Not Found', 
                                                msg: 'An error occured while getting user information'
                                            })
                                        }
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                } else {
                                    return res.send({
                                        status: false, 
                                        txt: 'Election Is Already Started', 
                                        msg: 'You cannot add more candidates if the election is started'
                                    })
                                }
                            } else {
                                throw new Error('internal error')
                            }
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            txt: 'Invalid Position / Partylists', 
                            msg: 'The Partylist / Position is deleted'
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
        console.log(e) 
        return res.status(500).send()
    }
})
//candidates list 
adminrouter.post('/control/elections/candidates/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 
    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {candidates: 1}).then( async (ca_elec) => {
            if(ca_elec.length > 0) {
                if(ca_elec[0].candidates.length > 0){
                    return res.render('control/forms/election-candidates-list', {
                        candidates: ca_elec[0].candidates, 
                        data: {
                            course: await course(), 
                            year: await year(), 
                            partylists: await partylists(), 
                            positions: await positions()
                        }
                    })
                } else {
                    return res.render('control/forms/election-candidates-list', {
                        candidates: [], 
                        data: {
                            course: await course(), 
                            year: await year(), 
                            partylists: await partylists(), 
                            positions: await positions()
                        }
                    })
                }
            } else {
                return res.status(404).send()
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e) 
        return res.status(500).send()
    }
})
// delete candidate permanently in election
adminrouter.post('/control/elections/candidates/delete/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session 
    
    try {
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            candidates: {$elemMatch: {id: {$eq: xs(id)}}}
        }, {candidates: {$elemMatch: {id: {$eq: xs(id)}}}, election_title: 1}).then( async (elec) => {
            if(elec.length !== 0){
                //pull the current candidate 
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}
                }, {$pull: {candidates: {id: xs(id)}}}).then( async () => {
                    const {_id} = await user_id(elec[0].candidates[0].student_id)
                    //send notification 
                    await newNotification(_id, 'election', {
                        id: uuid(), 
                        type: 'warning',
                        content: `Your candidacy has been deleted from the ${elec[0].election_title}`,
                        created: moment().tz("Asia/Manila").format()
                    })
                    return res.send({
                        status: true,
                        student_id: elec[0].candidates[0].student_id, 
                        txt: 'Candidate Deleted successfully'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: 'Election / Candidate Not Found', 
                    msg: 'Maybe the election / candidate is already deleted'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
}) 
//accept candidacy form 
adminrouter.post('/control/elections/candidates/accept-candidacy/', limit, isadmin, async (req, res) => {
    const {id} = req.body
    const {currentElection} = req.session
    try {
        //check if election and candidate is exist 
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            candidates: {$elemMatch: {id: {$eq: xs(id)}}}
        }, {candidates: {$elemMatch: {id: {$eq: xs(id)}}}, election_title: 1}).then( async (elec) => {
            //if election and candidates is exist 
            if(elec.length !== 0){
                //accept candidate 
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}, 
                    "candidates.id": {$eq: xs(id)}
                }, {$set: {"candidates.$.status": "Accepted"}}).then( async () => {
                    const {_id} = await user_id(elec[0].candidates[0].student_id)
                    //send notification 
                    await newNotification(_id, 'election', {
                        id: uuid(), 
                        type: 'info',
                        content: `Your candidacy has been accepted from the ${elec[0].election_title}`,
                        created: moment().tz("Asia/Manila").format()
                    })
                    return res.send({
                        status: true, 
                        student_id: elec[0].candidates[0].student_id,
                        txt: 'Candidate successfully accepted'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: 'Election / Candidate not found', 
                    msg: 'Maybe Election / Candidate is deleted'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//delete candidacy form 
adminrouter.post('/control/elections/candidates/delete-candidacy/', limit, isadmin, async (req, res) => {
    const {id, msg} = req.body
    const {currentElection} = req.session 
    
    try {
        //check if election and candidate is exist 
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            candidates: {$elemMatch: {id: {$eq: xs(id)}}}
        }, {candidates: {$elemMatch: {id: {$eq: xs(id)}}}, election_title: 1}).then( async (elec) => {
            //if election and candidates is exist 
            if(elec.length !== 0){
                //accept candidate 
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}, 
                    "candidates.id": {$eq: xs(id)}
                }, {$set: {
                    "candidates.$.status": "Deleted", 
                    "candidates.$.msg": xs(nl2br(msg))
                }}).then( async () => {
                    const {_id} = await user_id(elec[0].candidates[0].student_id)
                    //send notification 
                    await newNotification(_id, 'election', {
                        id: uuid(), 
                        type: 'warning',
                        content: `Your candidacy has been declined from the ${elec[0].election_title}`,
                        created: moment().tz("Asia/Manila").format()
                    })
                    return res.send({
                        status: true, 
                        student_id: elec[0].candidates[0].student_id,
                        txt: 'Candidate temporarily deleted'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: 'Election / Candidate not found', 
                    msg: 'Election / Candidate is deleted'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//sort candidates 
adminrouter.post('/control/election/candidates/sort/', limit, isadmin, async (req, res) => {
    const {sort} = req.body 
    const {currentElection} = req.session
    const srt = JSON.parse(xs(sort))
    let result = []
    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {candidates: 1}).then( async (ca) => {
            if(ca.length > 0){
                if(srt.type === "status") {
                    if(srt.value === 'default'){
                        return res.render('control/forms/election-candidates-list', {
                            candidates: ca[0].candidates, 
                            data: {
                                course: await course(), 
                                year: await year(), 
                                partylists: await partylists(), 
                                positions: await positions()
                            }
                        })
                    } else {
                        for(let i = 0; i < ca[0].candidates.length; i++){
                            if(ca[0].candidates[i].status === srt.value) {
                                result.push(ca[0].candidates[i])
                            }
                        }
                        return res.render('control/forms/election-candidates-list', {
                            candidates: result, 
                            data: {
                                course: await course(), 
                                year: await year(), 
                                partylists: await partylists(), 
                                positions: await positions()
                            }
                        })
                    }
                } else if(srt.type === "partylist") {
                    for(let i = 0; i < ca[0].candidates.length; i++){
                        if(ca[0].candidates[i].partylist === srt.value) {
                            result.push(ca[0].candidates[i])
                        }
                    }
                    return res.render('control/forms/election-candidates-list', {
                        candidates: result, 
                        data: {
                            course: await course(), 
                            year: await year(), 
                            partylists: await partylists(), 
                            positions: await positions()
                        }
                    })
                } else if(srt.type === "position") {
                    for(let i = 0; i < ca[0].candidates.length; i++){
                        if(ca[0].candidates[i].position === srt.value) {
                            result.push(ca[0].candidates[i])
                        }
                    }
                    return res.render('control/forms/election-candidates-list', {
                        candidates: result, 
                        data: {
                            course: await course(), 
                            year: await year(), 
                            partylists: await partylists(), 
                            positions: await positions()
                        }
                    })
                } else if(srt.type === "course") {
                    for(let i = 0; i < ca[0].candidates.length; i++){
                        if(ca[0].candidates[i].course === srt.value) {
                            result.push(ca[0].candidates[i])
                        }
                    }
                    return res.render('control/forms/election-candidates-list', {
                        candidates: result, 
                        data: {
                            course: await course(), 
                            year: await year(), 
                            partylists: await partylists(), 
                            positions: await positions()
                        }
                    })
                } else {
                    throw new Error('error')
                }
            } else {
                return res.render('control/forms/election-candidates-list', {
                    candidates: [], 
                    data: {
                        course: await course(), 
                        year: await year(), 
                        partylists: await partylists(), 
                        positions: await positions()
                    }
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
//search candidate 
adminrouter.post('/control/election/candidates/search/', limit, isadmin, async (req, res) => {
    const {search} = req.body
    const {currentElection} = req.session
    let result = []

    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {candidates: 1}).then( async (ca_elec) => {
            if(ca_elec.length > 0) {
                for(let i = 0; i < ca_elec[0].candidates.length; i++){
                    if(ca_elec[0].candidates[i].fullname.search(xs(search)) !== -1){
                        result.push(ca_elec[0].candidates[i])
                    }
                }
                return res.render('control/forms/election-candidates-list', {
                    candidates: result, 
                    data: {
                        course: await course(), 
                        year: await year(), 
                        partylists: await partylists(), 
                        positions: await positions()
                    }
                })
            } else {
                return res.render('control/forms/election-candidates-list', {
                    candidates: [], 
                    data: {
                        course: await course(), 
                        year: await year(), 
                        partylists: await partylists(), 
                        positions: await positions()
                    }
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        consol.log(e) 
        return res.status(500).send()
    }
})
//remove candidate 
adminrouter.post('/control/election/candidates/remove-candidate/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session
    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {candidates: 1, election_title: 1}).then( async (elec) => {
            if(elec.length > 0) {
                let ca_found = false, ca_student_id = null
                for(let i = 0; i < elec[0].candidates.length; i++){
                    if(elec[0].candidates[i].id === xs(id)) {
                        ca_found = true 
                        ca_student_id = elec[0].candidates[i].student_id
                        break
                    }
                }
                if(ca_found){ 
                    const {_id} = await user_id(ca_student_id)
                    console.log(_id)
                    await election.updateOne({_id: {$eq: xs(currentElection)}}, {$pull: {candidates: {id: xs(id)}}}).then( async () => {
                        //send notification 
                        await newNotification(_id, 'election', {
                            id: uuid(), 
                            type: 'warning',
                            content: `Your candidacy has been removed from the ${elec[0].election_title}`,
                            created: moment().tz("Asia/Manila").format()
                        })
                        return res.send({
                            status: true, 
                            txt: "Candidate Successfully Removed", 
                            msg: "", 
                            student_id: ca_student_id,
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else {
                    return res.send({
                        status: false, 
                        txt: "Candidate Not Found", 
                        msg: "Maybe Election / Candidate Is Already Deleted"
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    txt: "Election Not Found", 
                    msg: "Maybe Election Is Deleted"
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
//print all candidate 
adminrouter.get('/control/elections/id/:id/:from/candidates/print/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 

    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {candidates: 1}).then( async (ca) => {
            if(ca.length > 0){
                return res.render('control/forms/list-candidates', {
                    candidates: ca[0].candidates, 
                    data: {
                        courses: await course(), 
                        year: await year(), 
                        positions: await positions(), 
                        partylists: await partylists()
                    }
                })
            } else {
                return res.render('control/forms/list-candidates', {
                    candidates: [], 
                    data: {
                        courses: await course(), 
                        year: await year(), 
                        positions: await positions(), 
                        partylists: await partylists()
                    }
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e) 
        return res.status(500).render('error/500')
    }
})

//get voters
adminrouter.get('/control/elections/id/:id/:from/voters/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 
    const {id, from} = req.params
    try {
        await election.find({_id: {$eq: xs(currentElection)}}).then( async (elec) => {
            if(elec.length > 0) {
                return res.render('control/forms/election-voters', {
                    election: elec[0], 
                    data: {
                        courses: await course(), 
                        year: await year(), 
                        positions: await positions(), 
                        partylists: await partylists()
                    }, 
                    csrf: req.csrfToken(), 
                    link: `/control/elections/id/${id}/${from}/`
                })
            } else {
                return res.status(404).render('error/404')
            }
        })
    } catch (e) {
        console.log(e)
        return res.status(500).render('error/500')
    }
})
//get voters list 
adminrouter.post('/control/elections/voters/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session

    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {voters: 1}).then((elec_voters) => {
            return res.render('control/forms/election-voter-list', {
                voters: elec_voters.length > 0 ? elec_voters[0].voters : [],
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e) 
        return res.status(500).send()
    }
})
//search users add voter 
adminrouter.post('/control/elections/voters/search-users/', limit, isadmin, async (req, res) => {
    const {search} = req.body 
    const {currentElection} = req.session 
    let result = []
    try {
        await user.find({elections: {$ne: xs(currentElection)}}, {password: 0, username: 0, photo: 0, settings: 0, devices: 0}).then( async (users) => {
            if(users.length > 0) {
                if(search){
                    for(let i = 0; i < users.length; i++){
                        const fullname = `${users[i].firstname} ${users[i].middlename} ${users[i].lastname}`
                        if(await is_course_eligible(currentElection, users[i].course) && await is_year_eligible(currentElection, users[i].year) && fullname.search(xs(search)) !== -1) {
                            result.push(users[i])
                        }
                    }
                } else {
                    for(let i = 0; i < users.length; i++){
                        if(await is_course_eligible(currentElection, users[i].course) && await is_year_eligible(currentElection, users[i].year)) {
                            result.push(users[i])
                        }
                    }
                }
                return res.render('control/forms/list-users-not-voter', {
                    users: result,
                    data: {
                        courses: await course(), 
                        year: await year()
                    }
                })
            } else {
                return res.render('control/forms/list-users-not-voter', {
                    users: [],
                    data: {
                        courses: await course(), 
                        year: await year(), 
                        positions: await positions(), 
                        partylists: await partylists()
                    }
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
//add voter add user 
adminrouter.post('/control/elections/voters/add-user-add-voter/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session 
    let new_voter = {
        id: null, 
        student_id: null,
        fullname: null,
        course: null, 
        year: null,
        status: "Accepted",
        voted: [],
        isvoted: false,
        created: moment().tz("Asia/Manila").format()
    }
    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {_id: 1, election_title: 1}).then( async (elec) => {
            if(elec.length > 0){
                const userData = await user_data(id)
                if(userData){
                    new_voter.id = userData._id.toString() 
                    new_voter.student_id = userData.student_id 
                    new_voter.fullname = `${userData.firstname} ${userData.middlename} ${userData.lastname}`
                    new_voter.course = await mycourse(userData.course)
                    new_voter.year = await myyear(userData.year)
                    
                    await election.find({ _id: {$eq: xs(currentElection)}, "voters.id": {$eq: xs(userData._id.toString())}}).then( async (is_voter) => {
                        if(is_voter.length > 0){
                            return res.send({
                                status: false, 
                                txt: "User Is Already a Voter", 
                                msg: "Please Select Another User"
                            })
                        } else {
                            let elec_found = false 
                            for(let i = 0; i < userData.elections.length; i++){
                                if(userData.elections[i] === xs(currentElection.toString())) {
                                    elec_found = true
                                    break
                                }
                            }
                            if(!elec_found){
                                await user.updateOne({student_id: {$eq: xs(userData.student_id)}}, {$push: {elections: xs(currentElection.toString())}}).then( async () => {
                                    await election.updateOne({_id: {$eq: xs(currentElection)}}, {$push: {voters: new_voter}}).then( async () => {
                                        //send notification 
                                        await newNotification(new_voter.id, 'election', {
                                            id: uuid(), 
                                            type: 'info',
                                            content: `You are now a voter of ${elec[0].election_title}`,
                                            created: moment().tz("Asia/Manila").format()
                                        })
                                        return res.send({
                                            status: true, 
                                            txt: "User Successfully Added", 
                                            msg: `${new_voter.fullname} is now a voter`, 
                                            student_id: new_voter.student_id
                                        })
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                }).catch( (e) => {
                                    throw new Error(e)
                                })
                            } else {
                                return res.send({
                                    status: false, 
                                    txt: "User Is Already a Voter", 
                                    msg: "Please Select Another User"
                                })
                            }
                        }
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else {
                    return res.send({
                        status: false, 
                        txt: "User Data Not Found", 
                        msg: "Maybe User Is Deleted"
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    txt: "Election Not Found", 
                    msg: "Maybe Election Is Deleted"
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
//sort voters 
adminrouter.post('/control/elections/voters/sort-voters/', limit, isadmin, async (req, res) => {
    const {sort} = req.body 
    const srt = JSON.parse(xs(sort))
    const {currentElection} = req.session 
    let result = []
    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {voters: 1}).then( async (elec_voters) => {
            if(elec_voters.length > 0) {
                if(srt.type === "status"){
                    if(srt.value === "default"){
                        return res.render('control/forms/election-voter-list', {
                            voters: elec_voters[0].voters
                        })
                    } else {
                        for(let i = 0; i < elec_voters[0].voters.length; i++){
                            if(elec_voters[0].voters[i].status === srt.value){
                                result.push(elec_voters[0].voters[i])
                            }
                        }
                        return res.render('control/forms/election-voter-list', {
                            voters: result
                        })
                    }
                } else if(srt.type === "course") {
                    for(let i = 0; i < elec_voters[0].voters.length; i++){
                        if(elec_voters[0].voters[i].course === await mycourse(srt.value)){
                            result.push(elec_voters[0].voters[i])
                        }
                    }
                    return res.render('control/forms/election-voter-list', {
                        voters: result
                    })
                } else if(srt.type === "year") {
                    for(let i = 0; i < elec_voters[0].voters.length; i++){
                        if(elec_voters[0].voters[i].year === await myyear(srt.value)){
                            result.push(elec_voters[0].voters[i])
                        }
                    }
                    return res.render('control/forms/election-voter-list', {
                        voters: result
                    })
                } else {
                    throw new Error('unknown')
                }
            } else {
                return res.render('control/forms/election-voter-list', {
                    voters: []
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
//search voters 
adminrouter.post('/control/elections/voters/search-voters/', limit, isadmin, async (req, res) => {
    const {search} = req.body 
    const {currentElection} = req.session 
    let result = []
    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {voters: 1}).then( async (elec_voters) => {
            if(elec_voters.length > 0){
                for(let i = 0; i < elec_voters[0].voters.length; i++){
                    if(elec_voters[0].voters[i].fullname.search(xs(search)) !== -1){
                        result.push(elec_voters[0].voters[i])
                    }
                }
                return res.render('control/forms/election-voter-list', {
                    voters: result,
                })
            } else {
                return res.render('control/forms/election-voter-list', {
                    voters: [],
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
//accept voter request 
adminrouter.post('/control/elections/voters/accept-voter/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session 

    try {
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            voters: {$elemMatch: {id: {$eq: xs(id)}}}
        }, {voters: {$elemMatch: {id: {$eq: xs(id)}}}, election_title: 1}).then( async (elec_voter) => {
            if(elec_voter.length > 0){
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}, 
                    "voters.id": {$eq: xs(id)}
                }, {$set: {"voters.$.status": "Accepted"}}).then( async () => {
                    //send notification 
                    await newNotification(id, 'election', {
                        id: uuid(), 
                        type: 'info',
                        content: `You are now a voter of ${elec_voter[0].election_title}`,
                        created: moment().tz("Asia/Manila").format()
                    })
                    return res.send({
                        status: true, 
                        txt: "Voter Successfully Accepted", 
                        msg: "", 
                        student_id: elec_voter[0].voters[0].student_id
                    })
                }).catch((e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: "Voter Not Found", 
                    msg: "Please Refresh The Page"
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
//remove voter request 
adminrouter.post('/control/elections/voters/remove-voter/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session 
    try { 
        await election.find({_id: {$eq: xs(currentElection)}, voters: {$elemMatch: {id: {$eq: xs(id)}}}}, {voters: {$elemMatch: {id: {$eq: xs(id)}}}, election_title: 1}).then( async (elec_voter) => {
            if(elec_voter.length > 0){
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}, 
                    voters: {$elemMatch: {id: {$eq: xs(id)}}}
                }, {$pull: {voters: {id: {$eq: xs(id)}}}}).then( async () => {
                    //send notification 
                    await newNotification(id, 'election', {
                        id: uuid(), 
                        type: 'warning',
                        content: `You have been removed from the ${elec_voter[0].election_title}`,
                        created: moment().tz("Asia/Manila").format()
                    })
                    return res.send({
                        status: true, 
                        txt: "Voter Successfully Removed", 
                        msg: "", 
                        student_id: elec_voter[0].voters[0].student_id
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: "Voter Not Found", 
                    msg: "Please Refresh The App"
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
//print all voters 
adminrouter.get('/control/elections/id/:id/:from/voters/print/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session

    try {
        await election.find({_id: {$eq: xs(currentElection)}}, {voters: 1, election_title: 1}).then( (elec_voters) => {
            return res.render('control/forms/list-voters', {
                election: elec_voters.length > 0 ? elec_voters[0] : {},
                voters: elec_voters.length > 0 ? elec_voters[0].voters : []
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e) 
        return res.status(500).render('error/500')
    }
})

//add partylist in election 
adminrouter.post('/control/elections/e-add-pty/', limit, isadmin, async (req, res) => {
    const {pty} = req.body 
    const electionID = req.session.currentElection  
    let is_exists = false
    try {
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {partylist: 1}).then( async (e_pty) => {
            const p = e_pty.length === 0 ? [] : e_pty[0].partylist 
            for(let i = 0; i < p.length; i++){
                if(pty === p[i]){
                    is_exists = true 
                    break
                }
            }
            if(is_exists){
                return res.send({
                    add: false, 
                    msg: 'Partylist already exists'
                })
            } else {
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {$push: {partylist: xs(pty)}}).then( (ad) => {
                    return res.send({
                        add: true, 
                        msg: 'Partylist added successfully', 
                        id: xs(pty)
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
//remove partylist in election 
adminrouter.post('/control/elections/e-remove-partylist/', limit, isadmin, async (req, res) => {
    const {pty} = req.body 
    const electionID = req.session.currentElection 
    let pty_found = false
    try {
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {partylist: 1}).then( async (el) => {
            const e_data = el.length === 0 ? [] : el[0].partylist 
            for(let i = 0; i < e_data.length; i++){
                if(pty === e_data[i]){
                    pty_found = true 
                    break
                }
            }
            if(pty_found){
                //remove partylist from election
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {$pull: {partylist: xs(pty)}}).then( (p) => {
                    return res.send({
                        removed: true, 
                        msg: 'Successfully removed'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    removed: false, 
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
//search voter in election 
adminrouter.post('/control/elections/search-voter/', limit, isadmin, async (req, res) => {
    const {search, tab} = req.body 
    const {currentElection} = req.session
    const status = tab === 'ac' ? 'Accepted' : 'Pending'
    let result = []
    if(search){
        try {
            //get all voters 
            await election.find({_id: {$eq: xs(currentElection)}}, {voters: 1}).then( (v) => {
                if(v.length > 0){
                    for(let i = 0; i < v[0].voters.length; i++){
                        if(v[0].voters[i].status === status){
                            if(v[0].voters[i].fullname.search(xs(search)) !== -1 ){
                                result.push(v[0].voters[i])
                            }
                        }
                    }
                    return res.render(status === 'Accepted' ? "control/forms/accepted-voters" : "control/forms/pending-voters", {
                        voters: result
                    })
                } else {
                    return res.render(status === 'Accepted' ? "control/forms/accepted-voters" : "control/forms/pending-voters", {
                        voters: result
                    })
                }
            })
        } catch (e) {
            return res.status(500).send()
        }
    } else {
        return res.status(500).send()
    }
})
//election settings 
adminrouter.post('/control/elections/settings/:settings/', limit, isadmin, async (req, res) => {
    const {settings} = req.params
    const electionID = req.session.currentElection 
    try {
        await election.find({_id: {$eq: xs(electionID)}}).then( (elec) => {
            return res.render(`control/forms/${settings}`, {
                election: elec.length !== 0 ? elec[0] : [], 
                link: process.env.link
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})  
//change election title 
adminrouter.post('/control/election/settings/change-title/', limit, isadmin, async (req, res) => {
    const {e_title} = req.body 
    const electionID = req.session.currentElection
    try {
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {_id: 1, election_title: 1}).then( async (elec) => {
            //check if the elction is exists
            if(elec.length !== 0){
                //if exists 
                //check the new title if not the same with the current title 
                if(elec[0].election_title !== xs(e_title)){
                    //if not the same 
                    //check if the new title is not the same in other elections 
                    await election.find({
                        election_title: {$eq: xs(e_title)}
                    }).then( async (e_res) => {
                        if(e_res.length !== 0){
                            return res.send({
                                status: false, 
                                txt: 'Invalid title', 
                                msg: 'Election title is already in used in other election'
                            })
                        } else {
                            //update the election title 
                            await election.updateOne({
                                _id: {$eq: xs(electionID)}
                            }, {$set: {election_title: xs(e_title)}}).then( (up) => {
                                return res.send({
                                    status: true, 
                                    txt: 'Title successfully changed!'
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
                        txt: 'Invalid election title',
                        msg: 'New title cannot be the same in current title'
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    txt: 'Something went wrong!', 
                    msg: 'Election not found in database'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//change election description 
adminrouter.post('/control/election/settings/change-description/', limit, isadmin, async (req, res) => {
    const {election_description} = req.body 
    const electionID = req.session.currentElection 
    try {
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {election_description: 1}).then( async (d) => {
            if(d.length !== 0){
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {$set: {election_description: xs(election_description)}}).then( (upd) => {
                    return res.send({
                        status: true, 
                        txt: 'Description successfully changed!'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: 'Election not found'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//change election passcode
adminrouter.post('/control/election/settings/change-passcode/', limit, isadmin, async (req, res) => {
    const {e_passcode} = req.body 
    const electionID = req.session.currentElection
    try {
        //get all elections passcode and campare to the new election passcode 
        await election.find({}, {passcode: 1}).then( async (elecs) => {
            if(elecs.length !== 0){
                for(let i = 0; i < elecs.length; i++){
                    if(await compareHash(e_passcode, elecs[i].passcode)){
                        return res.send({
                            status: false, 
                            txt: "Passcode is already in used"
                        })
                    }
                }
                await election.find({
                    _id: {$eq: xs(electionID)}
                }, {passcode: 1}).then( async (ps) => {
                    if(ps.length !== 0){
                        const passcode = await hash(xs(e_passcode), 10)
                        await election.updateOne({
                            _id: {$eq: xs(electionID)}
                        }, {$set: {passcode: passcode}}).then( (up_e) =>{
                            return res.send({
                                status: true, 
                                txt: 'Passcode successfully changed!'
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            txt: 'Election not found'
                        })
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    txt: "Something went wrong"
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//force to start election
adminrouter.post('/control/election/settings/start-election/', limit, isadmin, async (req, res) => {
    const electionID = req.session.currentElection 
    try {
        //get election details 
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {status: 1, voters: 1, election_title: 1}).then( async (s) => {
            if(s.length !== 0){
                //check status
                // if the election is not started then start the election
                if(s[0].status === 'Not Started'){
                    //start election 
                    await election.updateOne({
                        _id: {$eq: xs(electionID)}
                    }, {$set: {
                        status: 'Started',
                        start: moment().tz("Asia/Manila").format()
                    }}).then( async () => {
                        for(let i = 0; i < s[0].voters.length; i++) {
                            await newNotification(s[0].voters[i].id, 'election', {
                                id: uuid(), 
                                type: 'info',
                                content: `${s[0].election_title} has been started`, 
                                created: moment().tz("Asia/Manila").format()
                            })
                        }
                        return res.send({
                            status: true, 
                            e_status: true,
                            msg: 'Election successfully started'
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                // if the election is already started
                } else if(s[0].status === 'Started'){
                    return res.send({
                        status: false,
                        e_status: true, 
                        msg: 'Election is already started'
                    })
                // if the election is already ended
                } else if(s[0].status === 'Ended'){
                    return res.send({
                        status: false,
                        e_status: true, 
                        msg: 'Election is already ended'
                    })
                } else {
                    return res.send({
                        status: false,
                        e_status: false, 
                        msg: 'Something went wrong'
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    e_status: false,
                    msg: 'Election not found'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//force to stop election 
adminrouter.post('/control/election/settings/stop-election/', limit, isadmin, async (req, res) => {
    const electionID = req.session.currentElection  
    try {
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {status: 1, voters: 1, election_title: 1}).then( async (s) => {
            if(s.length !== 0){
                if(s[0].status === 'Started'){
                    //update election and stop 
                    await election.updateOne({
                        _id: {$eq: xs(electionID)}
                    }, {$set: {
                        status: 'Ended', 
                        end: moment().tz("Asia/Manila").format()
                    }}).then( async () => {
                        for(let i = 0; i < s[0].voters.length; i++) {
                            await newNotification(s[0].voters[i].id, 'election', {
                                id: uuid(), 
                                type: 'info',
                                content: `${s[0].election_title} has been ended`, 
                                created: moment().tz("Asia/Manila").format()
                            })
                        }
                        return res.send({
                            status: true, 
                            e_status: false,
                            msg: 'Election ended successfully'
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else if(s[0].status === 'Ended'){
                    return res.send({
                        status: false, 
                        e_status: true,
                        msg: 'Election already ended'
                    })
                } else {
                    return res.send({
                        status: false, 
                        e_status: true,
                        msg: 'Something went wrong'
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    e_status: false,
                    msg: 'Election not found'
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
// change election starting date & time 
adminrouter.post('/control/election/settings/edit-starting-dt/', limit, isadmin, async (req, res) => {
    const {time} = req.body 
    const electionID = req.session.currentElection 
    if(time !== ''){
        try {
            //get election details 
            await election.find({
                _id: {$eq: xs(electionID)}
            }, {start: 1}).then( async (s) => {
                //if election is not empty 
                if(s.length !== 0){
                    await election.updateOne({
                        _id: {$eq: xs(electionID)}
                    }, {$set: {
                        start: xs(time), 
                        status: "Not Started"
                    }}).then( () => {
                        return res.send({
                            status: true, 
                            msg: "Starting Date & Time successfully changed!"
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else {
                    return res.send({
                        status: false, 
                        msg: 'Election not found!'
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            return res.status(500).send()
        }
    } else {
        return res.send({
            status: false, 
            msg: 'Please enter valid date & time'
        })
    }
})
// change election ending date & time 
adminrouter.post('/control/election/settings/edit-ending-dt/', limit, isadmin, async (req, res) => {
    const {time} = req.body 
    const electionID = req.session.currentElection 
    try {
        // check election status
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {status: 1, start: 1, end: 1, voters: 1, election_title: 1}).then( async (e_st) => {
           if(e_st.length !== 0){
                const e_start_time = moment(e_st[0].start).tz("Asia/Manila").fromNow().search("ago") != -1 ? true : false
                const e_end_time = moment(e_st[0].end).tz("Asia/Manila").fromNow().search("ago") != -1 ? true : false
                // if election is ended  
                if(e_st[0].status === 'Ended' && e_end_time){
                    //if election is already ended then restart the election and change to started 
                    await election.updateOne({
                        _id: {$eq: xs(electionID)}
                    }, {$set: {
                        status: 'Started', 
                        end: xs(time)
                    }}).then( async () => {
                        for(let i = 0; i < e_st[0].voters.length; i++) {
                            await newNotification(e_st[0].voters[i].id, 'election', {
                                id: uuid(), 
                                type: 'info',
                                content: `${e_st[0].election_title} has been restarted`, 
                                created: moment().tz("Asia/Manila").format()
                            })
                        }
                        return res.send({
                            status: true, 
                            msg: 'Election successfully restarted!'
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else {
                    await election.updateOne({
                        _id: {$eq: xs(electionID)}
                    }, {$set: {
                        end: xs(time), 
                        status: e_end_time ? 'Ended' : e_st[0].status
                    }}).then( (t) => {
                        return res.send({
                            status: true, 
                            msg: 'Ending Date & Time successfully changed!'
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                }
           } else {
               return res.send({
                   status: false, 
                   msg: "Election not found!"
               })
           }
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
// change elextion autoAccept_voters 
adminrouter.post('/control/election/settings/auto-accept-voters/', limit, isadmin, async (req, res) => {
    const {ac_v} = req.body 
    const electionID = req.session.currentElection 
    let auto_ac_v = ac_v === 'true' ? true : false
    try {
        //check if election is exists 
        await election.find({
            _id: {$eq: xs(electionID)}
        }).then( async (elec) => {
            if(elec.length !== 0){
                //update election 
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {$set: {autoAccept_voters: auto_ac_v}}).then( () => {
                    return res.send({
                        status: true, 
                        autoAccept: auto_ac_v,
                        txt: 'Updated successfully', 
                        msg: auto_ac_v ? 'All voters want join will be accepted automatically' : 'All voters want join will be not accepted automatically'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                }) 
            } else {
                return res.send({
                    status: false, 
                    msg: 'Election not found'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// change elextion autoAccept_candidates 
adminrouter.post('/control/election/settings/auto-accept-candidates/', limit, isadmin, async (req, res) => {
    const {ac_c} = req.body 
    const electionID = req.session.currentElection 
    let auto_ac_c = ac_c === 'true' ? true : false
    try {
        //check if election is exists 
        await election.find({
            _id: {$eq: xs(electionID)}
        }).then( async (elec) => {
            if(elec.length !== 0){
                //update election 
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {$set: {autoAccept_candidates: auto_ac_c}}).then( () => {
                    return res.send({
                        status: true, 
                        autoAccept: auto_ac_c,
                        txt: 'Updated successfully', 
                        msg: auto_ac_c ? 'All candidates want join will be accepted automatically' : 'All candidates want join will be not accepted automatically'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: 'Election not found'
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// election settings 
adminrouter.post('/control/elections/status/settings-menu/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session
    try {
        await election.find({_id: {$eq: xs(currentElection)}}).then( (elec) => {
            return res.render('control/forms/election-settings-menus', {
                election: elec.length === 0 ? {} : elec[0], 
                link: process.env.link
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// new election status 
adminrouter.post('/control/elections/status/election-date-time/', limit, isadmin, async (req, res) => {
    const electionID = req.session.currentElection 
    try {
        await election.find({
            _id: {$eq: xs(electionID)}
        }).then( (elec) => {
            return res.render('control/forms/election-date-time', {
                started:  moment(elec[0].start).tz("Asia/Manila").fromNow().search("ago") != -1 ? true : false, 
                end: moment(elec[0].end).tz("Asia/Manila").fromNow().search("ago") != -1 ? true : false, 
                endtime: moment(elec[0].end).tz("Asia/Manila").fromNow(), 
                election: elec[0]
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// delete election 
adminrouter.post('/control/election/settings/delete-election/', limit, isadmin, async (req, res) => {
    const electionID = req.session.currentElection 
    try {
        await election.find({_id: {$eq: xs(electionID)}}).then( async (elec) => {
            const status = elec[0].status 
            //check if election is started 
            if(status === 'Started'){
                return res.send({
                    status: false, 
                    txt: "Can't delete election", 
                    msg: "When election is started you cant delete the election"
                })
            } else {
                //flagged this election for deletion interval 1 day 
                await election.updateOne({
                    _id: {$eq: xs(electionID)}
                }, {$set: {
                    deletion_status: moment().tz("Asia/Manila").add(1, "days").format(), 
                    status: 'Pending for deletion'
                }}).then( (u) => {
                    return res.send({
                        status: true, 
                        txt: 'Election successfully updated',
                        msg: 'Election will be deleted one day from now'
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
// election status 
adminrouter.post('/control/election/status/', limit, isadmin, async (req, res) => {
    const electionID = req.session.currentElection 
    try {
        await election.find({_id: {$eq: xs(electionID)}}, {status: 1}).then( (elec) => {
            return res.render('control/forms/election-status', {
                election: elec[0]
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})

//get all election positions 
adminrouter.post('/control/elections/position-list/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 
    try {
        await election.find({
            _id: {$eq: xs(currentElection)}, 
        }, {positions: 1}).then( async (elec) => {
            return res.render('control/forms/election-positions-list', {
                e_positions: elec.length === 0 ? [] : elec[0].positions,
                data: {
                    positions: await positions()
                }
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//add positions 
adminrouter.post('/control/elections/add-position/', limit, isadmin, async (req, res) => {
    const {pos, max_vote} = req.body 
    const {currentElection} = req.session
    let new_pos = {
        id: xs(pos), 
        maxvote: xs(max_vote)
    }
    try {
        //check if the new position is not in used by the current election 
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            positions: {$elemMatch: {id: {$eq: xs(pos)}}}
        }).then( async (elec) => {
            if(elec.length === 0){
                //save new position 
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}
                }, {$push: {positions: new_pos}}).then( (u) => {
                    return res.send({
                        status: true, 
                        msg: "Positions added successfully", 
                        data: new_pos
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: "Position is already exists"
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
//remove position
adminrouter.post('/control/elections/remove-position/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session 
    try {
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            positions: {$elemMatch: {id: {$eq: xs(id)}}}
        }, {positions: {$elemMatch: {id: {$eq: xs(id)}}}}).then( async (elec) => {
            if(elec.length !== 0){
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}
                }, {$pull: {positions: {id: {$eq: xs(id)}}}}).then( () => {
                    return res.send({
                        status: true, 
                        msg: 'Position successfully removed'
                    })
                }).catch( (e) => {
                    throw new Eror(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: 'Position Not Found'
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
//get all election courses
adminrouter.post('/control/elections/courses-list/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 
    try {
        await election.find({
            _id: {$eq: xs(currentElection)}, 
        }, {courses: 1}).then( async (elec) => {
            
            return res.render('control/forms/election-course-list', {
                e_course: elec.length === 0 ? [] : elec[0].courses,
                data: {
                    course: await course()
                }
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//add election course
adminrouter.post('/control/elections/add-course/', limit, isadmin, async (req, res) => {
    const {crs} = req.body 
    const {currentElection} = req.session
    try {
        //check if the new course is not in used by the current election 
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            courses: {$elemMatch: {$eq: xs(crs)}}
        }).then( async (elec) => {
            if(elec.length === 0){
                //save new course
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}
                }, {$push: {courses: xs(crs)}}).then( (u) => {
                    return res.send({
                        status: true, 
                        msg: "Course added successfully"
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: "Course is already exists"
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
//remove election course
adminrouter.post('/control/elections/remove-course/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session 
    try {
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            courses: {$elemMatch: {$eq: xs(id)}}
        }, {courses: {$elemMatch: {$eq: xs(id)}}}).then( async (elec) => {
            if(elec.length !== 0){
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}
                }, {$pull: {courses: xs(id)}}).then( () => {
                    return res.send({
                        status: true, 
                        msg: 'Course successfully removed'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: 'Course Not Found'
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
//get all election year
adminrouter.post('/control/elections/year-list/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 
    try {
        await election.find({
            _id: {$eq: xs(currentElection)}, 
        }, {year: 1}).then( async (elec) => {
            return res.render('control/forms/election-year-list', {
                e_year: elec.length === 0 ? [] : elec[0].year,
                data: {
                    year: await year()
                }
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//add election year
adminrouter.post('/control/elections/add-year/', limit, isadmin, async (req, res) => {
    const {yr} = req.body 
    const {currentElection} = req.session
    try {
        //check if the new year is not in used by the current election 
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            year: {$elemMatch: {$eq: xs(yr)}}
        }).then( async (elec) => {
            if(elec.length === 0){
                //save new year
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}
                }, {$push: {year: xs(yr)}}).then( (u) => {
                    return res.send({
                        status: true, 
                        msg: "Year added successfully"
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: "Year is already exists"
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
//remove elction year
adminrouter.post('/control/elections/remove-year/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session 
    try {
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            year: {$elemMatch: {$eq: xs(id)}}
        }, {year: {$elemMatch: {$eq: xs(id)}}}).then( async (elec) => {
            if(elec.length !== 0){
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}
                }, {$pull: {year: xs(id)}}).then( () => {
                    return res.send({
                        status: true, 
                        msg: 'Year successfully removed'
                    })
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: 'Year Not Found'
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
/*##################################################################################### */

//positions 
adminrouter.get('/control/elections/positions/', isadmin, normal_limit, async (req, res, next) => {
    return res.render('control/forms/positions', {csrf: req.csrfToken()})
})
//all positions
adminrouter.post('/control/elections/positions/pos/', isadmin, normal_limit, async (req, res, next) => {
    try {
        await data.find({}, {positions: 1}, (err, p) => {
            if(err) throw new err 
            return res.render('control/forms/positions_all', {pos: p.length == 0 ? [] : p[0].positions})
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//add position
adminrouter.post('/control/elections/positions/add-position/', isadmin, normal_limit, async (req, res) => {
    const { position } = req.body
    const new_pos = {
        id: uuid(),
        type: xs(position)
    }
    try {
        //find if position is exists 
        await data.find({ 'positions.type': { $eq: xs(position) } }, (err, pos) => {
            if (err) {
                throw new err
            }
            if (!err) {
                if (pos.length === 1) {
                    return res.send({
                        done: false,
                        msg: 'Position already exists'
                    })
                }
                if (pos.length === 0) {
                    //check if position feild is empty 
                    data.find({}, (err, datas) => {
                        if (err) {
                            throw new err
                        }
                        if (!err) {
                            if (datas.length !== 0) {
                                //insert new position 
                                data.updateOne({ $push: { positions: new_pos } }, (err, inserted_pos) => {
                                    if (err) {
                                        throw new err
                                    }
                                    if (!err) {
                                        return res.send({
                                            done: true,
                                            msg: "Position Added Successfully!",
                                            data: new_pos
                                        })
                                    }
                                })
                            }
                            else {
                                //insert new position 
                                data.create({ position: new_pos }, (err, created) => {
                                    if (err) {
                                        throw new err
                                    }
                                    if (!err) {
                                        //insert new position 
                                        data.updateOne({ $push: { positions: new_pos } }, (err, inserted_pos) => {
                                            if (err) {
                                                throw new err
                                            }
                                            if (!err) {
                                                return res.send({
                                                    done: true,
                                                    msg: "Position Added Successfully!",
                                                    data: new_pos
                                                })
                                            }
                                        })
                                    }
                                })
                            }
                        }
                    })
                }
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//delete position 
adminrouter.post('/control/elections/positions/delete-position/', isadmin, delete_limit, async (req, res) => {
    const { id } = req.body
    //check if positin id is exists 
    try {
        await data.find({ "positions.id": { $eq: xs(id) } }, (err, find) => {
            if (err) {
                throw new err
            }
            if (!err) {
                if (find.length !== 0) {
                    //delete id 
                    data.updateOne({}, { $pull: { positions: { id: xs(id) } } }, (err, del) => {
                        if (err) {
                            throw new err
                        }
                        if (!err) {
                            return res.send({
                                deleted: true,
                                msg: "Deleted successfully"
                            })
                        }
                    })
                }
                else {
                    return res.send({
                        deleted: false,
                        msg: "Position not found!"
                    })
                }
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//update position 
adminrouter.post('/control/elections/positions/update-position/', isadmin, normal_limit, async (req, res) => {
    const { id, type } = req.body
    try {
        await data.find({ "positions.id": { $eq: xs(id) } }, (err, find) => {
            if (err) {
                throw new err
            }
            if (!err) {
                if (find.length !== 0) {
                    //check if the new position type is not the same in the db records
                    data.find({ "positions.type": { $eq: xs(type) } }, (err, same) => {
                        if(err){
                            throw new err
                        }
                        if(!err){
                            if(same.length === 0){
                                data.updateOne({"positions.id": xs(id)}, {$set: {"positions.$.type": xs(type)}}, (err, updated) => {
                                    if(err){
                                        throw new err
                                    } else {
                                        return res.send({
                                            updated: true, 
                                            msg: "Position updated successfully"
                                        })
                                    }
                                })
                            }
                            else{
                                return res.send({
                                    updated: false, 
                                    msg: "Position is already in used"
                                })
                            }
                        }
                    })
                } else {
                    return res.send({
                        updated: false,
                        msg: "Position not found"
                    })
                }
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})

/*##################################################################################### */

//voter id
adminrouter.get('/control/elections/voter-id/', normal_limit, isadmin, async (req, res) => {
    try {
        await data.find({}, {course: 1, year: 1}, (err, data) => {
            if(err) throw new err
            return res.render('control/forms/voter-id', { 
                course: data.length == 0 ? [] : data[0].course, 
                year:  data.length == 0 ? [] : data[0].year, 
                csrf: req.csrfToken()
            })
        })
    } catch(e) {
        return res.status(500).send()
    }
})
//get course 
adminrouter.post('/control/elections/voter-id/course/', normal_limit, isadmin, async (req, res) => {
    const {id} = req.body 
    try {
        await data.find({"course.id": {$eq: xs(id)}}, {course: 1}, (err, c) => {
            if(err) throw new err 
            return res.send({
                course: c.length == 0 ? "Error" : c[0].course[0].type
            })
        })
    } catch(e) {
        return res.status(500).send()
    }
})
//get year
adminrouter.post('/control/elections/voter-id/year/', normal_limit, isadmin, async (req, res) => {
    const {id} = req.body 
    try {
        await data.find({"year.id": {$eq: xs(id)}}, {year: 1}, (err, c) => {
            if(err) throw new err 
            return res.send({
                year: c.length == 0 ? "Error" : c[0].year[0].type
            })
        })
    } catch(e) {
        return res.status(500).send()
    }
})
//all ids
adminrouter.post('/control/elections/voter-id/ids/', normal_limit, isadmin, async (req, res) => {
    try {
       await data.find({}, {voterId: 1}).then( async (data) => {
            return res.render("control/forms/voter-id_all", {
                id: data.length != 0 ? data[0].voterId : [], 
                course: await course(), 
                year: await year(), 
            })
       }).catch( (e) => {
           throw new Error(e)
       })
    } catch(e) {
        return res.status(500).send()
    }
})
//check voter id
adminrouter.post('/control/elections/voter-id/verify/', isadmin, normal_limit, async (req, res) => {
    const { id } = req.body
    const voter_id = xs(id).toUpperCase()
    //check voter if exists 
    try {
        await data.find({"voterId.student_id": {$eq: voter_id} }, (err, res_id) => {
            if (err) throw new err
            if (res_id.length === 0) {
                return res.send({
                    status: true,
                })
            }
            else {
                return res.send({
                    status: false,
                    msg: "Voter ID is already exist"
                })
            }
        })
    } catch (e){
        return res.status(500).send()
    }
})
//add voter id
adminrouter.post('/control/elections/voter-id/add-voter-id/', isadmin, limit, async (req, res, next) => {
    const { id, crs, year } = req.body
    const new_random_voterID = xs(id) !== "" ? xs(id).toUpperCase() : `ESU-${moment().tz("Asia/Manila").format('YYYY')}-${Math.floor(0000 + Math.random() * 9999)}`
    //new voter ID
    const new_voterId = {
        id: uuid(), 
        student_id: new_random_voterID, //new student id
        course: xs(crs), 
        year: xs(year), 
        enabled: false
    }
    //check id 
    try{
        await data.find({ "voterId.student_id": {$eq: xs(id).toUpperCase()} }, (err, res_find) => {
            if (err) throw new err
            if (res_find.length == 0) {
                //check if course & year is valid 
                data.find({"course.id": {$eq: xs(crs)}, "year.id": {$eq: xs(year)}}, {"course.id": 1, "year.id": 1}, (err, cy) => {
                    if(err) throw new err 
                    if(cy.length == 0){
                        return res.send({
                            status: false, 
                            msg: "Invalid Course / Year"
                        })
                    } else {
                        //insert new voter id 
                        data.updateOne({}, {$push: {voterId: new_voterId}}, (err, new_v) => {
                           if(err) throw new err 
                           return res.send({
                               status: true, 
                               data: new_voterId, 
                               msg: "Voter ID added successfully"
                           })
                        })
                    }
                })
                
            } else {
                return res.send({
                    status: false,
                    msg: "Voter ID is already exists"
                })
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//delete voter id 
adminrouter.post('/control/elections/voter-id/delete-voter-id/', isadmin, delete_limit, async (req, res) => {
    const { id } = req.body
    try {
        //check voter id if in used
        await data.find({
            voterId: {$elemMatch: {id: {$eq: xs(id)}}}
        }, {
            voterId: {$elemMatch: {id: {$eq: xs(id)}}}
        }).then( async (v) => {
            if(v.length > 0){
                if(!v[0].voterId[0].enabled){
                    //delete voter id if it is not used
                    await data.updateOne({}, {$pull: {voterId: {id: {$eq: xs(id)}}}}).then( (d) => {
                        console.log(d)
                        return res.send({
                            status: true, 
                            txt: "Voter ID deleted successfully"
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else {
                    return res.send({
                        status: false, 
                        txt: "Your Can't delete this Voter ID", 
                        msg: "Voter ID is in used!"
                    })
                }
            } else {
                return res.send({
                    status: false, 
                    txt: "Voter ID not found"
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
//search voter id 
adminrouter.post('/control/elections/voter-id/search-voter-id/', search_limit, isadmin, async (req, res) => {
    const { search } = req.body
    let ids = []
    try {
        await data.find({}, {voterId: 1}).then( async (v) => {
            if(v.length > 0){
                if(xs(search)){
                    const voters = v[0].voterId
                    for(let i = 0; i < voters.length; i++){
                        if(voters[i].student_id.search(xs(search).toUpperCase()) !== -1){
                            ids.push(voters[i])
                        }
                    }
                    return res.render("control/forms/voter-id_all", {
                        id: ids, 
                        course: await course(), 
                        year: await year(), 
                    })
                } else {
                    return res.render("control/forms/voter-id_all", {
                        id: v.length === 0 ? [] : v[0].voterId, 
                        course: await course(), 
                        year: await year(), 
                    })
                }
            } else {
                return res.render("control/forms/voter-id_all", {
                    id: [], 
                    course: await course(), 
                    year: await year(), 
                })
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//sort
adminrouter.post('/control/elections/voter-id/sort-voter-id/', isadmin, normal_limit, async (req, res) => {
    const {sort} = req.body 
    const sorting = JSON.parse(xs(sort))
    try {
        if(sorting.type === 'status'){
            let used = [], notUsed = [], defaultIds = []
            await data.find({}, {voterId: 1}).then( async (voterID) => {
                if(voterID.length > 0){
                    const voterid = voterID[0].voterId
                    for(let i = 0; i < voterid.length; i++){
                        defaultIds.push(voterid[i])
                        if(voterid[i].enabled){
                            used.push(voterid[i])
                        }
                        if(!voterid[i].enabled){
                            notUsed.push(voterid[i])
                        }
                    }
                    if(sorting.id === "used"){
                        return res.render("control/forms/voter-id_all", {
                            id: used, 
                            course: await course(), 
                            year: await year(), 
                        })
                    } 
                    if(sorting.id === "not-used"){
                        return res.render("control/forms/voter-id_all", {
                            id: notUsed, 
                            course: await course(), 
                            year: await year(), 
                        })
                    } 
                    if(sorting.id === "default"){
                        return res.render("control/forms/voter-id_all", {
                            id: defaultIds, 
                            course: await course(), 
                            year: await year(), 
                        })
                    }
                } else {
                    return res.render("control/forms/voter-id_all", {
                        id: [], 
                        course: await course(), 
                        year: await year(), 
                    })
                }
            })
        } else if(sorting.type === 'course') {
            await data.find({}, {voterId: 1}).then( async (voterID) => {
                if(voterID.length > 0){
                    let courses = [] 
                    const voterid = voterID[0].voterId
                    for(let c = 0; c < voterid.length; c++){
                        if(sorting.id === voterid[c].course){
                            courses.push(voterid[c])
                        }
                    }
                    return res.render("control/forms/voter-id_all", {
                        id: courses, 
                        course: await course(), 
                        year: await year(), 
                    })
                } else {
                    return res.render("control/forms/voter-id_all", {
                        id: [], 
                        course: await course(), 
                        year: await year(), 
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } else if(sorting.type === "year") {
            await data.find({}, {voterId: 1}).then( async (voterID) => {
                if(voterID.length > 0){
                    let yrs = [] 
                    const voterid = voterID[0].voterId
                    for(let y = 0; y < voterid.length; y++){
                        if(sorting.id === voterid[y].year){
                            yrs.push(voterid[y])
                        }
                    }
                    return res.render("control/forms/voter-id_all", {
                        id: yrs, 
                        course: await course(), 
                        year: await year(), 
                    })
                } else {
                    return res.render("control/forms/voter-id_all", {
                        id: [], 
                        course: await course(), 
                        year: await year(), 
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            return res.render("control/forms/voter-id_all", {
                id: [], 
                course: await course(), 
                year: await year(), 
            })
        }
    } catch (e){
        console.log(e)
        return res.status(500).send()
    }
})
//get voter id use for checking if voter ID is valid
adminrouter.post('/control/elections/voter-id/get-voter-id/', limit, isadmin, async (req, res) => {
    const { id } = req.body
    const voter_id = xs(id)

    //get voter id 
    try {
        await data.find({ "voterId.id": {$eq: voter_id} }, {voterId: 1}, (err, result) => {
            if(err) throw new err
            if(result.length === 0){
                return res.send({
                    status: false, 
                    msg: "Voter ID not found"
                })
            } else {
                //check if the voter id and the voter id from result is the same 
                for(let i = 0; i < result[0].voterId.length; i++){
                    if(result[0].voterId[i].id === voter_id){
                        //flag this voter id for update
                        req.session.voter_id_to_update = result[0].voterId[i].id 
                        return res.send({
                            status: true, 
                            data: result[0].voterId[i]
                        })
                    }
                }
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//update voter id 
adminrouter.post('/control/elections/voter-id/update-voter-id/', limit, isadmin, async (req, res) => {
    const {sid, course, year, id} = req.body 
    let student_id
    try {
        //check voter id 
        
        // await data.find({
        //     voterId: {$elemMatch: {id: {$eq: xs(id)}}}
        // }, {voterId: {$elemMatch: {id: {$eq: xs(id)}}}}).then( async (v) => {
        //     //if voter id is found
        //     if(v.length > 0){
        //         student_id = v[0].voterId[0].student_id
        //         //check if the new course & year is valid 
        //         await data.find({
        //             course: {$elemMatch: {id: {$eq: xs(course)}}}, 
        //             year: {$elemMatch: {id: {$eq: xs(year)}}}
        //         }, {
        //             course: {$elemMatch: {id: {$eq: xs(course)}}}, 
        //             year: {$elemMatch: {id: {$eq: xs(year)}}}
        //         }).then( async (cy) => {
        //             //if the new course & year is valid
        //             if(cy.length > 0){
        //                 //check if the new voter id is not the same to others 
        //                 await data.find({
        //                     voterId: {$elemMatch: {student_id: {$eq: xs(sid).toUpperCase()}}}
        //                 }, {voterId: {$elemMatch: {student_id: {$eq: xs(sid).toUpperCase()}}}}).then( async (sidFound) => {
        //                     if(sidFound.length === 0){   
        //                         //update voter id 
        //                         await data.updateOne({
        //                             "voterId.id": {$eq: xs(id)}
        //                         }, {$set: {
        //                             "voterId.$.student_id": xs(sid).toUpperCase(), 
        //                             "voterId.$.course": xs(course), 
        //                             "voterId.$.year": xs(year)
        //                         }}).then( async () => {
        //                             //update user details who use this voter id 
        //                             await user.updateOne({
        //                                 student_id: {$eq: xs(student_id)}
        //                             }, {$set: {
        //                                 student_id: xs(sid).toUpperCase(), 
        //                                 course: xs(course), 
        //                                 year: xs(year)
        //                             }}).then( () => {
        //                                 return res.send({
        //                                     status: true, 
        //                                     msg: "Voter Id successfully updated!"
        //                                 })
        //                             }).catch( (e) => {
        //                                 throw new Error(e)
        //                             })
        //                         }).catch( (e) => {
        //                             throw new Error(e)
        //                         })
        //                     } else {
        //                         return res.send({
        //                             status: false, 
        //                             msg: "Voter ID is already in used"
        //                         })
        //                     }
        //                 })
        //             } else {
        //                 return res.send({
        //                     status: false, 
        //                     msg: "Invalid Course / Year"
        //                 })
        //             }
        //         }).catch( (e) => {
        //             throw new Error(e)
        //         })
        //     } else {
        //         return res.send({
        //             status: false, 
        //             msg: "Voter ID not found!"
        //         })
        //     }
        // })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})

/*##################################################################################### */

//course & year 
adminrouter.get('/control/elections/course&year/', limit, isadmin, async (req, res) => {
    return res.render('control/forms/cy', {csrf: req.csrfToken()})
})
//course
adminrouter.post('/control/elections/course&year/course/', limit, isadmin, async (req, res) => {
    try {
        await data.find({}, {course: 1}, (err, c) => {
            if(err) throw new err 
            return res.render('control/forms/course', {course: c.length != 0 ? c[0].course : []})
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//year 
adminrouter.post('/control/elections/course&year/year/', limit, isadmin, async (req, res) => {
    try {
        await data.find({}, {year: 1}, (err, y) => {
            if(err) throw new err 
            return res.render('control/forms/year', {year: y.length != 0 ? y[0].year : []})
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//add course & year 
adminrouter.post('/control/elections/course&year/add-cy/', limit, isadmin, async (req, res) => {
    const {course, year} = req.body 
    let isDbempty = true
    //check if db is not empty 
    try{
        await data.find({}, (err, s) => {
            if(err){
                throw new err
            } 
            if(!err){
                if(s.length != 0){
                    isDbempty = false
                }
            }
        })
    } catch (e){
        return res.status(500).send()
    }
    //if course & year is empty 
    if(!xs(course) && !xs(year)){
        return res.send({
            status: false, 
            msg: "Some feilds is empty"
        })
    }

    //if year is empty
    if(xs(course) && !xs(year)){
        //new course data
        const new_crs = {
            id: uuid(), 
            type: xs(course).toUpperCase()
        }
        //check if the new course is already exist 
        try {
            await data.find({"course.type": {$eq: xs(course).toUpperCase()}}, (err, c) => {
                if(err){
                    throw new err
                } 
                if(!err){
                    if(c.length == 0){
                        //if empty create new data
                        if(isDbempty){
                            //insert new data 
                            data.create({
                                positions: [], 
                                course: [new_crs], 
                                year: [], 
                                partylists: []
                            }, (err, n) => {
                                if(err){
                                    throw new err
                                } else {
                                    return res.send({
                                        status: true, 
                                        msg: "Course Added Successfully", 
                                        type: "course",
                                        data: new_crs
                                    })
                                }
                            })
                        } else {
                            //push new data
                            data.updateOne({}, {$push: {course: new_crs}}, (err, n) => {
                                if(err){
                                    throw new err
                                } else {
                                    return res.send({
                                        status: true, 
                                        msg: "Course Added Successfully", 
                                        type: "course",
                                        data: new_crs
                                    })
                                }
                            })
                        }
                    } else {
                        return res.send({
                            status: false, 
                            msg: "Course already exist!"
                        })
                    }
                }
            })
        } catch (e) {
            return res.status(500).send()
        }
    }

    //if course is empty
    if(!xs(course) && xs(year)){
        //new course data
        const new_y = {
            id: uuid(), 
            type: xs(year)
        }
        //check if the new course is already exist 
        try {
            await data.find({"year.type": {$eq: xs(year)}}, (err, y) => {
                if(err){
                    return res.send({
                        status: false, 
                        msg: "Internal Error!"
                    })
                }
                if(!err){
                    if(y.length == 0){
                        //if empty create new data
                        if(isDbempty){
                            data.create({
                                positions: [], 
                                course: [], 
                                year: [new_y], 
                                partylists: []
                            }, (err, u) => {
                                if(err){
                                    throw new err
                                } else {
                                    return res.send({
                                        status: true, 
                                        msg: "Year Added Successfully", 
                                        type: "year",
                                        data: new_y
                                    })
                                }
                            })
                        } else {
                            //insert new year 
                            data.updateOne({}, {$push: {year: new_y}}, (err, u) => {
                                if(err){
                                    throw new err
                                } else {
                                    return res.send({
                                        status: true, 
                                        msg: "Year Added Successfully", 
                                        type: "year",
                                        data: new_y
                                    })
                                }
                            })
                        }
                    } else {
                        return res.send({
                            status: false, 
                            msg: "Year already exist!"
                        })
                    }
                }
            })
        } catch (e) {
            return res.status(500).send()
        }
    }

    //if course & year is not empty 
    if(xs(course) && xs(year)){
        //new course 
        const new_crs = {
            id: uuid(), 
            type: xs(course).toUpperCase()
        }
        //new year 
        const new_y = {
            id: uuid(), 
            type: xs(year)
        }

        try{
            //check if course & year is already exist in db
            let crs = false, yr = false
            await data.find({"course.type": {$eq: xs(course).toUpperCase()}}, (err, c) => {
                if(err) throw new err 
                crs = c.length != 0 ? true : false
            })
            await data.find({"year.type": {$eq: xs(year)}}, (err, y) => {
                if(err) throw new err 
                yr = y.length != 0 ? true : false
            })
            if(!crs && !yr){
                if(isDbempty){
                    data.create({
                        positions: [], 
                        course: [new_crs], 
                        year: [new_y], 
                        partylists: []
                    }, (err, up) => {
                         if(err){
                             throw new err
                         } else {
                             return res.send({
                                 status: true, 
                                 msg: "Added Successfully", 
                                 type: "c&y",
                                 data: {
                                     course: new_crs, 
                                     year: new_y
                                 }
                             })
                         }
                    })
                } else {
                     data.updateOne({}, {$push: {course: new_crs, year: new_y}}, (err, up) => {
                         if(err){
                             throw new err
                         } else {
                             return res.send({
                                 status: true, 
                                 msg: "Added Successfully", 
                                 type: "c&y",
                                 data: {
                                     course: new_crs, 
                                     year: new_y
                                 }
                             })
                         }
                     })
                }
            } else {
                return res.send({
                    status: false, 
                    msg: "Course or Year already exist"
                })
            }
        } catch(e){
            return res.status(500).send()
        } 
    }
})
//delete course 
adminrouter.post('/control/elections/course&year/del_c/', delete_limit, isadmin, async (req, res) => {
    const {id} = req.body 

    //find if course is exist 
    try{
        await data.find({"course.id": {$eq: xs(id)}}, {"course.id": 1}, (err, find) => {
            if(err){
                return res.send({
                    status: false, 
                    msg: "Internal Error!"
                })
            }
            if(!err){
                if(find.length != 0){
                    data.updateOne({}, {$pull: {course: {id: xs(id)}}}, (err, del) => {
                        if(err){
                            return res.send({
                                status: false, 
                                msg: "Internal Error!"
                            })
                        } else {
                            return res.send({
                                status: true, 
                                msg: "Deleted successfully"
                            })
                        }
                    })
                } else {
                    return res.send({
                        status: false, 
                        msg: "Course not found!"
                    })
                }
            }
        })
    } catch (e) {
        return res.send({
            status: false, 
            msg: "Internal Error!"
        })
    }
})
//delete year 
adminrouter.post('/control/elections/course&year/del_y/', delete_limit, isadmin, async (req, res) => {
    const {id} = req.body 

    //find if year is exist 
    try{
        await data.find({"year.id": {$eq: xs(id)}}, {"year.id": 1}, (err, find) => {
            if(err){
                return res.send({
                    status: false, 
                    msg: "Internal Error!"
                })
            }
            if(!err){
                if(find.length != 0){
                    data.updateOne({}, {$pull: {year: {id: xs(id)}}}, (err, del) => {
                        if(err){
                            return res.send({
                                status: false, 
                                msg: "Internal Error!"
                            })
                        } else {
                            return res.send({
                                status: true, 
                                msg: "Deleted successfully"
                            })
                        }
                    })
                } else {
                    return res.send({
                        status: false, 
                        msg: "Year not found!"
                    })
                }
            }
        })
    } catch (e) {
        return res.send({
            status: false, 
            msg: "Internal Error!"
        })
    }
})
//update course 
adminrouter.post('/control/elections/course&year/up_c/', normal_limit, isadmin, async (req, res) => {
    const {id, new_course} = req.body 
    //check if course id exists in db 
    try {
        await data.find({"course.id": {$eq: xs(id)}}, (err, f) => {
            if(err) throw new err
            if(f.length !== 0){
                //check if the new course is already in used or not 
                data.find({"course.type": {$eq: xs(new_course).toUpperCase()}}, (err, t) => {
                    if(err) throw new err
                    if(!err){
                        if(t.length == 0){
                            //update course 
                            data.updateOne({"course.id": {$eq: xs(id)}}, {$set: {"course.$.type": xs(new_course).toUpperCase()}}, (err, up_c) => {
                                if(err) throw new err
                                if(!err){
                                    return res.send({
                                        status: true, 
                                        msg: "Course updated successfully"
                                    })
                                }
                            })
                        }
                    }
                })
            } else {
                return res.send({
                    status: false, 
                    msg: "Course not found!"
                })
            }
        })
    } catch (e){
        return res.send({
            status: false, 
            msg: "Internal Error!"
        })
    }
})
//update year 
adminrouter.post('/control/elections/course&year/up_y/', normal_limit, isadmin, async (req, res) => {
    const {id, new_year} = req.body 
    //check if course id exists in db 
    try {
        await data.find({"year.id": {$eq: xs(id)}}, (err, f) => {
            if(err){
                throw new err
            }
            if(!err){
                if(f.length !== 0){
                    //check if the new course is already in used or not 
                    data.find({"year.type": {$eq: xs(new_year)}}, (err, t) => {
                        if(err){
                            throw new err
                        }
                        if(!err){
                            if(t.length == 0){
                                //update course 
                                data.updateOne({"year.id": {$eq: xs(id)}}, {$set: {"year.$.type": xs(new_year)}}, (err, up_c) => {
                                    if(err){
                                        throw new err
                                    }
                                    if(!err){
                                        return res.send({
                                            status: true, 
                                            msg: "Year Updated successfully"
                                        })
                                    }
                                })
                            } else {
                                return res.send({
                                    status: false, 
                                    msg: "Year is already exist"
                                })
                            }
                        }
                    })
                } else {
                    return res.send({
                        status: false, 
                        msg: "Year not found!"
                    })
                }
            }
        })
    } catch (e){
        return res.status(500).send()
    }
})

/*##################################################################################### */

//partylist 
adminrouter.get('/control/elections/partylist/', normal_limit, isadmin, async (req, res) => {
    return res.render("control/forms/partylist", {csrf: req.csrfToken()})
})
//partylist all 
adminrouter.post('/control/elections/partylist/pty/', normal_limit, isadmin, async (reeq, res) => {
    try {
        await data.find({}, {partylists: 1}, (err, p) => {
            if(err) throw new err
            return res.render("control/forms/partylist_all", {partylist: p.length == 0 ? [] : p[0].partylists})
        })
    } catch (e){
        return res.status(500).send()
    }
})
//add partylist 
adminrouter.post('/control/elections/partylist/add-partylist/', normal_limit, isadmin, async (req, res) => {
    const {partylist} = req.body
    const pty = xs(partylist)
    const new_pty = {
        id: uuid(), 
        type: pty
    }
    try {
        await data.find({"partylists.type": {$eq: pty}}, (err, p) => {
            if(err) {
                throw new err
            } 
            if(!err){
                if(p.length === 0 ){
                    data.updateOne({}, {$push: {partylists: new_pty}}, (err, np) => {
                        if(err) {
                            throw new err
                        } 
                        if(!err){
                            return res.send({
                                done: true, 
                                msg: "Partylist added successfully",
                                data: new_pty
                            })
                        }
                    })
                } else {
                    return res.send({
                        done: false, 
                        msg: "Partylist already exists"
                    })
                }
            }
        })
    } catch(e){
        return res.status(500).send()
    }
})
//delete partylist 
adminrouter.post('/control/elections/partylist/delete-partylist/', delete_limit, isadmin, async (req, res) => {
    const {id} = req.body 
    
    try{ 
        await data.find({"partylists.id": {$eq: xs(id)}}, {"partylists.id": 1}, (err, i) => {
            if(err) {
                throw new err
            } 
            if(!err){
                if(i.length != 0){
                    data.updateOne({}, {$pull: {partylists: {id: xs(id)}}}, (err, del) => {
                        if(err) {
                            throw new err
                        } 
                        if(!err){ 
                            return res.send({
                                deleted: true, 
                                msg: "Partylist Deleted"
                            })
                        }
                    })
                } else {
                    return res.send({
                        deleted: false, 
                        msg: "Partylist not found"
                    })
                }
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//update partylist 
adminrouter.post('/control/elections/partylist/update-partylist/', normal_limit, isadmin, async (req, res) => {
    const {id, type} = req.body 
    try {
        await data.find({"partylists.id": {$eq: xs(id)}}, {"partylists.id": 1}, (err, i) => {
            if(err) {
                throw new err
            } 
            if(!err){
                if(i.length != 0){
                    data.updateOne({"partylists.id": {$eq: xs(id)}}, {$set: {"partylists.$.type": xs(type)}}, (err, up) => {
                        if(err) {
                            throw new err
                        } 
                        if(!err){
                            return res.send({
                                updated: true, 
                                msg: "Updated Successfully"
                            })
                        }
                    })
                } else {
                    return res.send({
                        update: false, 
                        msg: "Partylist not found"
                    })
                }
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})

/*##################################################################################### */

//users main
adminrouter.get('/control/users/', normal_limit, isadmin, async (req, res) => {
    try {
        return res.render('control/forms/users', {
            data: {
                course: await course(), 
                year: await year()
            },
            csrf: req.csrfToken()
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//get all users
adminrouter.post('/control/users/all-users/', limit, isadmin, async (req, res) => {
    try {
        //gte all users in users collection 
        await user.find({}, {password: 0}).sort({lastname: 1}).then( async (users) => {
            return res.render('control/forms/users-all', {
                users: users,
                data: {
                    course: await course(), 
                    year: await year()
                },
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e){
        console.log(e)
        return res.status(500).send()
    }
})
//add user 
adminrouter.post('/control/users/add-user/', limit, isadmin, async (req, res) => {
    const { sid, fname, mname, lname, crs, yr} = req.body
    const newfullname = `${xs(fname.toLowerCase()).replace(/\s+/g, ' ').trim()} ${xs(mname.toLowerCase()).replace(/\s+/g, ' ').trim()} ${xs(lname.toLowerCase()).replace(/\s+/g, ' ').trim()}`
    try {
        if (sid && fname && mname && lname && crs && yr) {
            //check all names 
            await user.find({}, {firstname: 1, middlename: 1, lastname: 1}).then( async (names) => {
                if(names.length > 0){
                    //check all names 
                    for(let i = 0; i < names.length; i++){
                        const fullname = `${names[i].firstname.toLowerCase()} ${names[i].middlename.toLowerCase()} ${names[i].lastname.toLowerCase()}`
                        if(fullname === newfullname){
                            return res.send({
                                status: false, 
                                msg: "Name is already in used"
                            })
                        }
                    }
                    //add user account 
                    await data.find({
                        voterId: {
                            $elemMatch: {
                                student_id: { $eq: xs(sid.toUpperCase()) },
                                course: { $eq: xs(crs) },
                                year: { $eq: xs(yr) },
                                enabled: false
                            }
                        }
                    }, {
                        voterId: {
                            $elemMatch: {
                                student_id: { $eq: xs(sid.toUpperCase()) },
                                course: { $eq: xs(crs) },
                                year: { $eq: xs(yr) },
                                enabled: false
                            }
                        }
                    }).then(async (v) => {
                        if (v.length > 0) {
                            //add new user 
                            await user.create({
                                student_id: xs(sid),
                                firstname: xs(toUppercase(fname)).replace(/\s+/g, ' ').trim(),
                                middlename: xs(toUppercase(mname)).replace(/\s+/g, ' ').trim(),
                                lastname: xs(toUppercase(lname)).replace(/\s+/g, ' ').trim(),
                                course: xs(crs),
                                year: xs(yr),
                                socket_id: 'Offline',
                                username: `${fname.toUpperCase()}-${xs(sid).toUpperCase()}`,
                                password: await hash(`WMSU-${xs(sid).toUpperCase()}`, 10)
                            }).then(async () => {
                                //update student id to enabled == true 
                                await data.updateOne({
                                    "voterId.student_id": { $eq: xs(sid).toUpperCase() }
                                }, { $set: { "voterId.$.enabled": true } }).then(() => {
                                    return res.send({
                                        status: true,
                                        msg: "User Successfully Added!"
                                    })
                                }).catch((e) => {
                                    throw new Error(e)
                                })
                            }).catch((e) => {
                                throw new Error(e)
                            })
                        } else {
                            //create new voter id and save the new user
                            //check if the course & year is available 
                            await data.find({
                                $and: [
                                    { course: {
                                        $elemMatch: {id: {$eq: xs(crs)}}
                                    }}, 
                                    { year: {
                                        $elemMatch: {id: {$eq: xs(yr)}}
                                    }}
                                ]
                            }).then( async (cy) => {
                                if(cy.length > 0){
                                    //create new voter id 
                                    const new_voterId = {
                                        id: uuid(), 
                                        student_id: xs(sid).toUpperCase(),
                                        course: xs(crs), 
                                        year: xs(yr), 
                                        enabled: true
                                    }
                                    //check if new student is is not exists 
                                    await data.find({
                                        voterId: {$elemMatch: {student_id: {$eq: xs(sid).toUpperCase()}}}
                                    }).then( async (v) => {
                                        if(v.length === 0){
                                            await data.updateOne({}, {$push: {voterId: new_voterId}}).then( async (v) => {
                                                //add new user 
                                                await user.create({
                                                    student_id: xs(sid),
                                                    firstname: xs(toUppercase(fname)).replace(/\s+/g, ' ').trim(),
                                                    middlename: xs(toUppercase(mname)).replace(/\s+/g, ' ').trim(),
                                                    lastname: xs(toUppercase(lname)).replace(/\s+/g, ' ').trim(),
                                                    course: xs(crs),
                                                    year: xs(yr),
                                                    socket_id: 'Offline',
                                                    username: `${fname.toUpperCase()}-${xs(sid).toUpperCase()}`,
                                                    password: await hash(`WMSU-${xs(sid).toUpperCase()}`, 10)
                                                }).then( (crt) => {
                                                    return res.send({
                                                        status: true, 
                                                        msg: 'New user added successfully'
                                                    })
                                                }).catch( (e) => {
                                                    throw new Error(e)
                                                })
                                            }).catch( (e) => {
                                                throw new Error(e)
                                            })
                                        } else {
                                            return res.send({
                                                status: false, 
                                                msg: 'Student ID is already exists!'
                                            })
                                        }
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                } else {
                                    return res.send({
                                        status: false, 
                                        msg: 'Course & Year is not found'
                                    })
                                }
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }
                    }).catch((e) => {
                        throw new Error(e)
                    })
                } else {
                    //add user account
                    await data.find({
                        voterId: {
                            $elemMatch: {
                                student_id: { $eq: xs(sid.toUpperCase()) },
                                course: { $eq: xs(crs) },
                                year: { $eq: xs(yr) },
                                enabled: false
                            }
                        }
                    }, {
                        voterId: {
                            $elemMatch: {
                                student_id: { $eq: xs(sid.toUpperCase()) },
                                course: { $eq: xs(crs) },
                                year: { $eq: xs(yr) },
                                enabled: false
                            }
                        }
                    }).then(async (v) => {
                        if (v.length > 0) {
                            //add new user 
                            await user.create({
                                student_id: xs(sid),
                                firstname: xs(toUppercase(fname)).replace(/\s+/g, ' ').trim(),
                                middlename: xs(toUppercase(mname)).replace(/\s+/g, ' ').trim(),
                                lastname: xs(toUppercase(lname)).replace(/\s+/g, ' ').trim(),
                                course: xs(crs),
                                year: xs(yr),
                                socket_id: 'Offline',
                                username: `${fname.toUpperCase()}-${xs(sid).toUpperCase()}`,
                                password: await hash(`WMSU-${xs(sid).toUpperCase()}`, 10)
                            }).then(async () => {
                                //update student id to enabled == true 
                                await data.updateOne({
                                    "voterId.student_id": { $eq: xs(sid).toUpperCase() }
                                }, { $set: { "voterId.$.enabled": true } }).then(() => {
                                    return res.send({
                                        status: true,
                                        msg: "User Successfully Added!"
                                    })
                                }).catch((e) => {
                                    throw new Error(e)
                                })
                            }).catch((e) => {
                                throw new Error(e)
                            })
                        } else {
                            //create new voter id and save the new user
                            //check if the course & year is available 
                            await data.find({
                                $and: [
                                    { course: {
                                        $elemMatch: {id: {$eq: xs(crs)}}
                                    }}, 
                                    { year: {
                                        $elemMatch: {id: {$eq: xs(yr)}}
                                    }}
                                ]
                            }).then( async (cy) => {
                                if(cy.length > 0){
                                    //create new voter id 
                                    const new_voterId = {
                                        id: uuid(), 
                                        student_id: xs(sid).toUpperCase(),
                                        course: xs(crs), 
                                        year: xs(yr), 
                                        enabled: true
                                    }
                                    //check if new student is is not exists 
                                    await data.find({
                                        voterId: {$elemMatch: {student_id: {$eq: xs(sid).toUpperCase()}}}
                                    }).then( async (v) => {
                                        if(v.length === 0){
                                            await data.updateOne({}, {$push: {voterId: new_voterId}}).then( async (v) => {
                                                //add new user 
                                                await user.create({
                                                    student_id: xs(sid),
                                                    firstname: xs(toUppercase(fname)).replace(/\s+/g, ' ').trim(),
                                                    middlename: xs(toUppercase(mname)).replace(/\s+/g, ' ').trim(),
                                                    lastname: xs(toUppercase(lname)).replace(/\s+/g, ' ').trim(),
                                                    course: xs(crs),
                                                    year: xs(yr),
                                                    socket_id: 'Offline',
                                                    username: `${fname.toUpperCase()}-${xs(sid).toUpperCase()}`,
                                                    password: await hash(`WMSU-${xs(sid).toUpperCase()}`, 10)
                                                }).then( (crt) => {
                                                    return res.send({
                                                        status: true, 
                                                        msg: 'New user added successfully'
                                                    })
                                                }).catch( (e) => {
                                                    throw new Error(e)
                                                })
                                            }).catch( (e) => {
                                                throw new Error(e)
                                            })
                                        } else {
                                            return res.send({
                                                status: false, 
                                                msg: 'Student ID is already exists!'
                                            })
                                        }
                                    }).catch( (e) => {
                                        throw new Error(e)
                                    })
                                } else {
                                    return res.send({
                                        status: false, 
                                        msg: 'Course & Year is not found'
                                    })
                                }
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        }
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
                msg: 'Some feilds is empty'
            })
        }
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//search user 
adminrouter.post('/control/users/search-users/', limit, isadmin, async (req, res) => {
    const {search} = req.body 
    let users_res = []
    try {
        //get all users 
        await user.find({}, {passcode: 0}).sort({lastname: 1}).then( async (users) => {
            if(users.length > 0){
                for(let i = 0; i < users.length; i++){
                    const fullname = `${users[i].firstname} ${users[i].middlename} ${users[i].lastname}`
                    if(fullname.search(xs(search)) !== -1){
                        users_res.push(users[i])
                    }
                }
                return res.render('control/forms/users-all', {
                    users: users_res,
                    data: {
                        course: await course(), 
                        year: await year()
                    },
                })
            } else {
                return res.render('control/forms/users-all', {
                    users: [],
                    data: {
                        course: await course(), 
                        year: await year()
                    },
                })
            }
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//sort users 
adminrouter.post('/control/users/sort-users/', limit, isadmin, async (req, res) => {
    const {sort} = req.body 
    const sort_val = JSON.parse(sort)
    try {
        if(sort_val.type === "course"){
            await user.find({
                course: {$eq: xs(sort_val.id)}
            }, {passcode: 0}).sort({lastname: 1}).then( async (users) => {
                return res.render('control/forms/users-all', {
                    users: users,
                    data: {
                        course: await course(), 
                        year: await year()
                    },
                })
            }).catch( (e) => {
                throw new Error(e)
            })
        } else if(sort_val.type === "year"){
            await user.find({
                year: {$eq: xs(sort_val.id)}
            }, {passcode: 0}).sort({lastname: 1}).then( async (users) => {
                return res.render('control/forms/users-all', {
                    users: users,
                    data: {
                        course: await course(), 
                        year: await year()
                    },
                })
            }).catch( (e) => {
                throw new Error(e)
            })
        } else if(sort_val.type === "active_status"){
            let online = [], offline = []
            await user.find({}, {passcode: 0}).sort({lastname: 1}).then( async (users) => {
                if(users.length > 0){
                    for(let i = 0; i < users.length; i++){
                        if(users[i].socket_id === "Offline"){
                            offline.push(users[i])
                        }
                        if(users[i].socket_id !== "Offline"){
                            online.push(users[i])
                        }
                    }
                    if(sort_val.id === "online"){
                        return res.render('control/forms/users-all', {
                            users: online,
                            data: {
                                course: await course(), 
                                year: await year()
                            },
                        })
                    } else if(sort_val.id === "offline"){
                        return res.render('control/forms/users-all', {
                            users: offline,
                            data: {
                                course: await course(), 
                                year: await year()
                            },
                        })
                    } else if(sort_val.id === "default"){
                        return res.render('control/forms/users-all', {
                            users: users,
                            data: {
                                course: await course(), 
                                year: await year()
                            },
                        })
                    } else {
                        throw new Error("Unknown Sort")
                    }
                } else {
                    return res.render('control/forms/users-all', {
                        users: [],
                        data: {
                            course: await course(), 
                            year: await year()
                        },
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
//election result 
adminrouter.get('/control/elections/:id/results/', isadmin, limit, async (req, res) => {
    const {id} = req.params 
    const {currentElection} = req.session 
    
    try {
        if(id === currentElection.toString()){
            await election.find({_id: {$eq: xs(id)}}, {passcode: 0}).then( async (elec) => {
                if(elec.length > 0) {
                    return res.render('control/forms/election-results', {
                        election: elec[0],
                        data: {
                            courses: await course(), 
                            year: await year(), 
                            positions: await positions(), 
                            partylists: await partylists()
                        },
                        csrf: req.csrfToken()
                    })
                } else {
                    return res.status(404).render('error/404')
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            throw new Error('not =')
        }
    } catch (e) {
        console.log(e) 
        return res.status(500).send()
    }
})
//election result print
adminrouter.get('/control/elections/:id/results/print/', isadmin, limit, async (req, res) => {
    const {id} = req.params 
    const {currentElection} = req.session 
    
    try {
        if(id === currentElection.toString()){
            await election.find({_id: {$eq: xs(id)}}, {passcode: 0}).then( async (elec) => {
                if(elec.length > 0) {
                    return res.render('control/forms/election-results-print', {
                        election: elec[0],
                        data: {
                            courses: await course(), 
                            year: await year(), 
                            positions: await positions(), 
                            partylists: await partylists()
                        },
                        csrf: req.csrfToken()
                    })
                } else {
                    return res.status(404).render('error/404')
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } else {
            throw new Error('not =')
        }
    } catch (e) {
        console.log(e) 
        return res.status(500).send()
    }
})
//get user information 
adminrouter.post('/control/users/info/', isadmin, limit, async (req, res) => {
    const {id} = req.body 
    
    try {
        await user.find({_id: {$eq: xs(id)}}, {firstname: 1, middlename: 1, lastname: 1, course: 1, year: 1, student_id: 1, bio: 1, type: 1, socket_id: 1}).then( async (userData) => {
            if(userData.length > 0) {
                return res.render('control/forms/user-settings-info', {
                    userData: userData[0], 
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
        return res.status(500).send(e)
    }
})
//get user elections attented 
adminrouter.post('/control/users/elections/', isadmin, limit, async (req, res) => {
    const {id} = req.body 
    const {elections, type} = await user_data(id)
    let res_elections = []
    try {
        if(elections.length > 0) {
            for(let i = 0; i < elections.length; i++) {
                await election.find({_id: {$eq: xs(elections[i])}}, {election_title: 1, status: 1, voters: 1, candidates: 1}).then( (elec) => {
                    if(elec.length > 0) { 
                        res_elections.push(elec[0]) 
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            }
            return res.render('control/forms/user-settings-elections', {
                elections: res_elections, 
                role: type
            })
        } else {
            return res.render('control/forms/user-settings-elections', {
                elections: res_elections
            })
        }
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//get user account 
adminrouter.post('/control/users/account/', isadmin, limit, async (req, res) => {
    const {id} = req.body 
    try {
        return res.render('control/forms/user-settings-account', {
            userData: await user_data(id), 
            data: {
                courses: await course(), 
                year: await year()
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//get user devices 
adminrouter.post('/control/users/devices/', isadmin, limit, async (req, res) => {
    const {id} = req.body 
    const {devices, _id} = await user_data(id)
    try {
        return res.render('control/forms/user-settings-devices', {
            devices: devices, 
            id: _id
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//get user email
adminrouter.post('/control/users/email/', isadmin, limit, async (req, res) => {
    const {id} = req.body 
    const {email, _id} = await user_data(id)
    try {
        return res.render('control/forms/user-settings-email', {
            email: email, 
            id: _id
        })
    } catch (e) {
        console.log(e)
        return res.status(500).send()
    }
})
//update fullname 
adminrouter.post('/control/users/update/:cmd/', isadmin, limit, async (req, res) => {
    const {cmd} = req.params 
    const {id, fname, mname, lname, type, course, year, usr, pass} = req.body
    const {firstname, email, elections, student_id} = await user_data(id)
    try {
        if(xs(cmd) === "fullname"){
            if(fname && mname && lname){
                //check if user exists 
                await user.find({_id: {$eq: xs(id)}}, {_id: 1}).then( async (userData) => {
                    if(userData.length > 0) {
                        await user.updateOne({_id: {$eq: xs(id)}}, {$set: {firstname: xs(toUppercase(fname)), middlename:  xs(toUppercase(mname)), lastname:  xs(toUppercase(lname))}}).then( async () => {
                            const flname = `${xs(toUppercase(fname))} ${xs(toUppercase(mname))} ${xs(toUppercase(lname))}`
                            for(let i = 0; i < elections.length; i++){
                                await election.updateOne({
                                    _id: {$eq: xs(elections[i])}, 
                                    voters: {$elemMatch: {id: {$eq: xs(id)}}}
                                }, {$set: {
                                    "voters.$.fullname": flname, 
                                    "candidates.$.fullname": flname
                                }}).catch( (e) => {
                                    throw new Error(e)
                                })
                            }
                            //send notification to user 
                            await newNotification(id, 'account', {
                                id: uuid(), 
                                content: "Your name has been updated",
                                created: moment().tz("Asia/Manila").format()
                            })
                            return res.send({
                                status: true, 
                                student_id: student_id,
                                msg: "Successfully updated"
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            msg: "User not found"
                        })
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: "Invalid fullname"
                })
            }
        } else if(xs(cmd) === 'cy') {
            if(course && year){
                //check if user exists 
                await user.find({_id: {$eq: xs(id)}}, {_id: 1}).then( async (userData) => {
                    if(userData.length > 0) {
                        await user.updateOne({_id: {$eq: xs(id)}}, {$set: {course: xs(course), year: xs(year)}}).then( async () => {
                            //send notification to user 
                            await newNotification(id, 'account', {
                                id: uuid(), 
                                content: "Your Course & Year has been updated",
                                created: moment().tz("Asia/Manila").format()
                            })
                            return res.send({
                                status: true, 
                                student_id: student_id,
                                msg: "Successfully updated"
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    } else {
                        return res.send({
                            status: false, 
                            msg: "User not found"
                        })
                    }
                }).catch( (e) => {
                    throw new Error(e)
                })
            } else {
                return res.send({
                    status: false, 
                    msg: "Invalid course / year"
                })
            }
        } else if(xs(cmd) === "account") {
            if(xs(usr) === process.env.admin_username || xs(pass) === process.env.admin_password) {
                return res.send({
                    status: false, 
                    msg: 'Invalid Username / Password'
                })
            } else {
                let thesame_pass = false
                //check username 
                await user.find({username: {$eq: xs(usr)}}).then( async (usrname) => {
                    if(usrname.length > 0) {
                        return res.send({
                            status: false, 
                            msg: 'Username is already taken'
                        })
                    } else {
                        //check password 
                        await user.find({}, {password: 1}).then( async (usrpass) => {
                            if(usrpass.length > 0) {
                                for(let i = 0; i < usrpass.length; i++){
                                    if(await compareHash(xs(pass), usrpass[i].password)) {
                                        thesame_pass = true 
                                        break
                                    }
                                }
                            } else {
                                thesame_pass = false
                            }
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                        
                        if(!thesame_pass){
                            const account = {
                                username: xs(usr), 
                                password: xs(pass)
                            }
                            await user.updateOne({_id: {$eq: xs(id)}}, {$set: {username: xs(usr), password: await hash(xs(pass), 10)}}).then( async () => {
                                change_account_cred(email.email, firstname, account)
                                //send notification to user 
                                await newNotification(id, 'account', {
                                    id: uuid(), 
                                    content: "Your Username & Password has been updated",
                                    created: moment().tz("Asia/Manila").format()
                                })
                                return res.send({
                                    status: true, 
                                    student_id: student_id,
                                    msg: 'Successfully updated'
                                })
                            }).catch( (e) => {
                                throw new Error(e)
                            })
                        } else {
                            return res.send({
                                status: false, 
                                msg: 'Password is already taken'
                            })
                        }
                    }
                }).catch( (e) => {
                    throw new Error(e)
                }) 
            }
        } else {
            return res.send({
                status: false, 
                msg: 'Invalid Command'
            })
        }
    } catch (e) {
        console.log(e) 
        return res.status(500).send()
    }
})
//reset specific user account 
adminrouter.post('/control/users/reset-account/', isadmin, limit, async (req, res) => {
    const {id} = req.body 
    const {student_id, firstname, email} = await user_data(id)
    try {
        //hash
        const new_account = {
            username: `${firstname.toUpperCase()}-${student_id}`, 
            password: await hash(`WMSU-${student_id}`, 10),
        }
        //not hash 
        const account = {
            username: `${firstname.toUpperCase()}-${student_id}`, 
            password: `WMSU-${student_id}`,
        } 
        await user.updateOne({_id: {$eq: xs(id)}}, {$set: { username: new_account.username, password: new_account.password }}).then( async () => {
            if(email.email) {
                restore_account_email(email.email, firstname, account)
                //send notification to user 
                await newNotification(id, 'account', {
                    id: uuid(), 
                    content: "Your Account has been reset",
                    created: moment().tz("Asia/Manila").format()
                })
                return res.send({
                    status: true, 
                    student_id: student_id,
                    msg: 'Successfully reset', 
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
//reset all users account 
adminrouter.post('/control/users/reset-users-account/', isadmin, limit, async (req, res) => {
    try {
        await user.find({}, {_id: 1, firstname: 1, student_id: 1, username: 1, password: 1, email: 1}).then( async (usersData) => {
            if(usersData.length > 0) {
                for(let i = 0; i < usersData.length; i++){
                    //hash
                    const new_account = {
                        username: `${usersData[i].firstname.toUpperCase()}-${usersData[i].student_id}`, 
                        password: await hash(`WMSU-${usersData[i].student_id}`, 10)
                    }
                    //not hash
                    const account = {
                        username: `${usersData[i].firstname.toUpperCase()}-${usersData[i].student_id}`,
                        password: `WMSU-${usersData[i].student_id}`
                    }
                    await user.updateOne({_id: usersData[i]._id}, {$set: { username: new_account.username, password: new_account.password }}).then( async () => {
                        if(usersData[i].email.email) {
                            //send notification to user 
                            await newNotification(usersData[i]._id, 'account', {
                                id: uuid(), 
                                content: "Your Account has been reset",
                                created: moment().tz("Asia/Manila").format()
                            })
                            restore_account_email(usersData[i].email.email, usersData[i].firstname, account)
                        }
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                }
                return res.send({
                    status: true, 
                    txt: 'Successfully resetted', 
                    student_id: usersData[i].student_id,
                    msg: 'All users account was successfully resetted'
                })
            } else {
                return res.send({
                    status: false, 
                    txt: 'No users found', 
                    msg: 'Database is empty'
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
//print all users
adminrouter.get('/control/users/print/',isadmin, normal_limit, async (req, res) => {
    try {
        await user.find({}, {created: 1, student_id: 1, firstname: 1, middlename: 1, lastname: 1, course: 1, year: 1, username: 1, password: 1}).sort({lastname: 1}).then( async (users) => {
            return res.render('control/forms/list-users', {
                users: users, 
                data: {
                    courses: await course(), 
                    year: await year()
                }
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e) 
        return res.status(500).send()
    }
})
//get all notifications 
adminrouter.post('/control/notifications/', isadmin, normal_limit, async (req, res) => {
    const {} = req.session 

    try {
        await adminData.find({}, {notifications: 1}).then( (notifications) => {
            return res.render('control/extras/notifications-list', {
                notifications: notifications.length > 0 ? notifications[0].notifications : {}
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        console.log(e) 
        return res.status(500).send()
    }
})
module.exports = adminrouter
