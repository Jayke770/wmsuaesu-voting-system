if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const express = require('express')
const adminrouter = express.Router()
const {isadmin} = require('./auth')
const user = require('../models/user')
const election = require('../models/election')
const data = require('../models/data')
const { search_limit, limit, normal_limit, delete_limit } = require('./rate-limit')
const {hash, compareHash, course, year, partylists, positions} = require('./functions')
const genpass = require('generate-password')
const xs = require('xss')
const { v4: uuid } = require('uuid')
const objectid = require('mongodb').ObjectID
const moment = require('moment-timezone')
const nl2br = require('nl2br')
/*##################################################################################### */
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
        return res.render('control/home', {elections: elections})
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
    const start = moment(xs(e_start)).tz("Asia/Manila").format() 
    const end = moment(xs(e_end)).tz("Asia/Manila").format()
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
    console.log(moment(xs(e_start)).tz("Asia/Manila").format(), moment(xs(e_end)).tz("Asia/Manila").format())
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
            //get the submitted course & check if it exists in db 
            for(let i = 0; i < crs.length; i++){
                //get each index and find to db 
                await data.find({"course.id": {$eq: crs[i]}}, {course:{id : 1}}, (err, f) => {
                    if(err) throw new err 
                    //if the course is not found
                    if(f.length === 0) {
                        e_crs = false 
                        return res.send({
                            created: false, 
                            msg: "Invalid Course", 
                            txt: "Please check the courses or do not edit the value of the element"
                        })
                    }
                })
            }
            //get the submitted year & check if it exists in db 
            for(let i = 0; i < yr.length; i++){
                await data.find({"year.id": {$eq: yr[i]}}, {year:{id : 1}}, (err, f) => {
                    if(err) throw new err 
                    //if the year is not found
                    if(f.length === 0) {
                        e_yr = false 
                        return res.send({
                            created: false, 
                            msg: "Invalid Year", 
                            txt: "Please check the year or do not edit the value of the element"
                        })
                    }
                })
            }
            //get the submitted positions & check if it exists in db 
            for(let i = 0; i < pos.length; i++){
                await data.find({"positions.id": {$eq: pos[i].id}}, {positions:{id : 1}}, (err, f) => {
                    if(err) throw new err 
                    //if the position is not found
                    if(f.length === 0) {
                        e_pos = false 
                        return res.send({
                            created: false, 
                            msg: "Invalid positions", 
                            txt: "Please check the positions or do not edit the value of the element"
                        })
                    }
                })
            }
            //get the submitted partylist & check if it exists in db 
            for(let i = 0; i < pty.length; i++){
                await data.find({"partylists.id": {$eq: pty[i]}}, {partylists:{id : 1}}, (err, f) => {
                    if(err) throw new err 
                    //if the partylist is not found
                    if(f.length === 0) {
                        e_pty = false 
                        return res.send({
                            created: false, 
                            msg: "Invalid partylists", 
                            txt: "Please check the partylist or do not edit the value of the element"
                        })
                    }
                })
            }
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
//get all accepted voters in current election 
adminrouter.post("/control/elections/accepted-voters/", limit, isadmin, async (req, res) => {
    const id = req.session.currentElection
    try {
        await election.find({
            _id: {$eq: xs(id)}
        }, {voters: 1}).then( (elecs) => {
            const e_voters = elecs.length === 0 ? [] : elecs[0].voters
            let voters = []
            for(let i = 0; i < e_voters.length; i++){
                if(e_voters[i].status === 'Accepted'){
                    voters.push(e_voters[i])
                }
            }
            return res.render("control/forms/accepted-voters", {
                voters: voters
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//get all pending voters in current election 
adminrouter.post("/control/elections/pending-voters/", limit, isadmin, async (req, res) => {
    const id = req.session.currentElection
    try {
        await election.find({
            _id: {$eq: xs(id)}
        }, {voters: 1}).then( (elecs) => {
            const e_voters = elecs.length === 0 ? [] : elecs[0].voters
            let voters = []
            for(let i = 0; i < e_voters.length; i++){
                if(e_voters[i].status === 'Pending'){
                    voters.push(e_voters[i])
                }
            }
            return res.render("control/forms/pending-voters", {
                voters: voters
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//accept voter request
adminrouter.post('/control/elections/accept-voter/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const electionID = req.session.currentElection 
    try {
        // get election
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {voters: 1}).then( async (elec) => {
            const e_data = elec.length === 0 ? [] : elec[0].voters 
            if(e_data.length !== 0){
                for(let i = 0; i < e_data.length; i++){
                    if(id.toString() === e_data[i].id.toString()){
                        await election.updateOne({
                            _id: {$eq: xs(electionID)}, 
                            "voters.id": {$eq: e_data[i].id}
                        }, { $set: {"voters.$.status": 'Accepted'}}).then( (v) => {
                            return res.send({
                                status: true, 
                                msg: "Voter Accepted Successfully"
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    }
                }
            } else {
                return res.send({
                    status: false, 
                    msg: "Something went wrong"
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//delete voter request
adminrouter.post('/control/elections/deny-voter/', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const electionID = req.session.currentElection 
    try {
        // get election
        await election.find({
            _id: {$eq: xs(electionID)}
        }, {voters: 1}).then( async (elec) => {
            const e_data = elec.length === 0 ? [] : elec[0].voters 
            if(e_data.length !== 0){
                for(let i = 0; i < e_data.length; i++){
                    if(id.toString() === e_data[i].id.toString()){
                        await election.updateOne({
                            _id: {$eq: xs(electionID)}, 
                            "voters.id": {$eq: e_data[i].id}
                        }, { $set: {"voters.$.status": 'Deleted'}}).then( (v) => {
                            return res.send({
                                status: true, 
                                msg: "Voter successfully deleted"
                            })
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    }
                }
            } else {
                return res.send({
                    status: false, 
                    msg: "Something went wrong"
                })
            }
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
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
    const {search, search_by, tab} = req.body 
    const electionID = req.session.currentElection
    const status = tab === 'ac' ? 'Accepted' : 'Pending'
    let result = []
    if(search !== '' && search_by !== ''){
        try {
            //get all voters 
            await election.find({
                _id: {$eq: xs(electionID)}
            }, {voters: 1}).then( (v) => {
                if(v.length !== 0){
                    const voters = v.length === 0 ? [] : v[0].voters
                    if(voters.length !== 0){
                        if(search_by === 'sid'){
                            for(let i = 0; i < voters.length; i++){
                                if(voters[i].status !== 'Deleted' && voters[i].status === status){
                                    if(voters[i].student_id.search(search.toUpperCase()) !== -1 || voters[i].student_id === search.toUpperCase()){
                                        result.push(voters[i])
                                    }
                                }
                            }
                        } else if(search_by === 'name'){
                            for(let i = 0; i < voters.length; i++){
                                if(voters[i].status !== 'Deleted' && voters[i].status === status){
                                    if(voters[i].fullname.search(search) !== -1 || voters[i].fullname === search){
                                        result.push(voters[i])
                                    }
                                }
                            }
                        } else if(search_by === 'course'){
                            for(let i = 0; i < voters.length; i++){
                                if(voters[i].status !== 'Deleted' && voters[i].status === status){
                                    if(voters[i].course.search(search.toUpperCase()) !== -1 || voters[i].course === search){
                                        result.push(voters[i])
                                    }
                                }
                            }
                        } else if(search_by === 'year'){
                            for(let i = 0; i < voters.length; i++){
                                if(voters[i].status !== 'Deleted' && voters[i].status === status){
                                    if(voters[i].year.search(search) !== -1 || voters[i].year === search){
                                        result.push(voters[i])
                                    }
                                }
                            }
                        } else {
                            throw new Error('Something went wrong')
                        }
                        //render the results 
                        return res.render(status === 'Accepted' ? "control/forms/accepted-voters" : "control/forms/pending-voters", {
                            voters: result
                        })
                    } else {
                        return res.render("control/forms/accepted-voters", {
                            voters: []
                        })
                    }
                } else {
                    return res.render("control/forms/accepted-voters", {
                        voters: []
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
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
        }, {status: 1}).then( async (s) => {
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
                    }}).then( () => {
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
        }, {status: 1}).then( async (s) => {
            if(s.length !== 0){
                if(s[0].status === 'Started'){
                    //update election and stop 
                    await election.updateOne({
                        _id: {$eq: xs(electionID)}
                    }, {$set: {
                        status: 'Ended', 
                        end: moment().tz("Asia/Manila").format()
                    }}).then( () => {
                        return res.send({
                            status: true, 
                            e_status: false,
                            msg: 'Election terminated successfully'
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
                        start: xs(time)
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
        }, {status: 1, start: 1, end: 1}).then( async (e_st) => {
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
                    }}).then( (t) => {
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
        console.log(e)
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
                    deletion_status: moment().tz("Asia/Manila").format(), 
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
// accepted candidates in election 
adminrouter.post('/control/elections/candidates/accepted-candidates/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 
    let candidates_accepted = []
    try {
        //check election if exist 
        await election.find({
            _id: {$eq: xs(currentElection)}
        }, {candidates: 1}).then( async (ca) => {
            const candidates = ca.length === 0 ? [] : ca[0].candidates
            for(let i = 0; i < candidates.length; i++){
                if(candidates[i].status === 'Accepted'){
                    candidates_accepted.push(candidates[i])
                }
            }
            return res.render('control/forms/election-settings-accepted-candidates', {
                candidates: candidates_accepted, 
                data: {
                    course: await course(), 
                    year: await year(), 
                    positions: await positions(), 
                    partylists: await partylists()
                }
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// pending candidates in election 
adminrouter.post('/control/elections/candidates/pending-candidates/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 
    let candidates_pending = []
    try {
        //check election if exist 
        await election.find({
            _id: {$eq: xs(currentElection)}
        }, {candidates: 1}).then( async (ca) => {
            const candidates = ca.length === 0 ? [] : ca[0].candidates
            for(let i = 0; i < candidates.length; i++){
                if(candidates[i].status === 'Pending'){
                    candidates_pending.push(candidates[i])
                }
            }
            return res.render('control/forms/election-settings-pending-candidates', {
                candidates: candidates_pending, 
                data: {
                    course: await course(), 
                    year: await year(), 
                    positions: await positions(), 
                    partylists: await partylists()
                }
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
// deleted candidates in election 
adminrouter.post('/control/elections/candidates/deleted-candidates/', limit, isadmin, async (req, res) => {
    const {currentElection} = req.session 
    let candidates_deleted = []
    try {
        //check election if exist 
        await election.find({
            _id: {$eq: xs(currentElection)}
        }, {candidates: 1}).then( async (ca) => {
            const candidates = ca.length === 0 ? [] : ca[0].candidates
            for(let i = 0; i < candidates.length; i++){
                if(candidates[i].status === 'Deleted'){
                    candidates_deleted.push(candidates[i])
                }
            }
            return res.render('control/forms/election-settings-deleted-candidates', {
                candidates: candidates_deleted, 
                data: {
                    course: await course(), 
                    year: await year(), 
                    positions: await positions(), 
                    partylists: await partylists()
                }
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
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
            "candidates.id": {$eq: xs(id)}
        }).then( async (elec) => {
            if(elec.length !== 0){
                //pull the current candidate 
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}
                }, {$pull: {candidates: {id: xs(id)}}}).then( (del) => {
                    return res.send({
                        status: true, 
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
            "candidates.id": {$eq: xs(id)}
        }, {candidates: 1}).then( async (elec) => {
            //if election and candidates is exist 
            if(elec.length !== 0){
                //accept candidate 
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}, 
                    "candidates.id": {$eq: xs(id)}
                }, {$set: {"candidates.$.status": "Accepted"}}).then( (ac) => {
                    return res.send({
                        status: true, 
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
            "candidates.id": {$eq: xs(id)}
        }, {candidates: 1}).then( async (elec) => {
            //if election and candidates is exist 
            if(elec.length !== 0){
                //accept candidate 
                await election.updateOne({
                    _id: {$eq: xs(currentElection)}, 
                    "candidates.id": {$eq: xs(id)}
                }, {$set: {
                    "candidates.$.status": "Deleted", 
                    "candidates.$.msg": xs(nl2br(msg))
                }}).then( (ac) => {
                    return res.send({
                        status: true, 
                        txt: 'Candidate temporarily deleted'
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
// get candidacy information 
adminrouter.post('/control/elections/candidates/candidacy-information', limit, isadmin, async (req, res) => {
    const {id} = req.body 
    const {currentElection} = req.session 

    try {
        //check if election and candidate is exists 
        await election.find({
            _id: {$eq: xs(currentElection)}, 
            candidates: {$elemMatch: {id: {$eq: xs(id)}}}
        }, {candidates: {$elemMatch: {id: {$eq: xs(id)}}}}).then( async (ca) => { 
            return res.render('control/forms/election-settings-candidacy-info', {
                candidate: ca.length === 0 ? [] : ca[0].candidates[0], 
                data: {
                    course: await course(), 
                    year: await year(),
                    positions: await positions(), 
                    partylists: await partylists()
                }
            })
        }).catch( (e) => {
            throw new Error(e)
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//sort candidates 
adminrouter.post('/control/election/candidates/sort/', limit, isadmin, async (req, res) => {
    const {search_by, id, tab} = req.body
    let render_tab, status, sort_ca = []
    const {currentElection} = req.session
    if(tab === "ac"){
        render_tab = 'control/forms/election-settings-accepted-candidates'
        status = "Accepted"
    }
    if(tab === "pend"){
        render_tab = 'control/forms/election-settings-pending-candidates'
        status = "Pending"
    } 
    if(tab === "del") {
        render_tab = 'control/forms/election-settings-deleted-candidates'
        status = "Deleted"
    }
    try {
        //get election candidates 
        await election.find({_id: {$eq: xs(currentElection)}}, {candidates: 1}).then( async (elec) => {
            const candidates = elec.length === 0 ? [] : elec[0].candidates  
            for(let i = 0; i < candidates.length; i++){
                // sort by positions
                if(search_by === 'position'){
                    if(candidates[i].position === xs(id) && candidates[i].status === status){
                        sort_ca.push(candidates[i])
                    }
                }
                // sort by partylists
                if(search_by === 'position'){
                    if(candidates[i].partylist === xs(id) && candidates[i].status === status){
                        sort_ca.push(candidates[i])
                    }
                }
                // sort by course
                if(search_by === 'course'){
                    if(candidates[i].course === xs(id) && candidates[i].status === status){
                        sort_ca.push(candidates[i])
                    }
                }
                // sort by year
                if(search_by === 'year'){
                    if(candidates[i].year === xs(id) && candidates[i].status === status){
                        sort_ca.push(candidates[i])
                    }
                }
            }
            return res.render(render_tab, {
                candidates: sort_ca, 
                data: {
                    course: await course(), 
                    year: await year(), 
                    positions: await positions(), 
                    partylists: await partylists()
                }
            })
        })
    } catch (e) {
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
       await data.find({}, {voterId: 1, course: 1, year: 1}, (err, data) => {
           if(err) throw new err 
           return res.render("control/forms/voter-id_all", {
               id: data.length != 0 ? data[0].voterId : [], 
               course: data.length != 0 ? data[0].course : [], 
               year: data.length != 0 ? data[0].year : [], 
           })
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
    //new voter ID
    const new_voterId = {
        id: uuid(), 
        student_id: xs(id).toUpperCase(), //new student id
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
                               msg: "Voter ID Added"
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
adminrouter.post('/control/elections/voter-id/delete-voter-id/', isadmin, delete_limit, async (req, res, next) => {
    const { id } = req.body
    const voter_id = xs(id)
    //check voter id if not used
    try{
        await data.find({ "voterId.id": {$eq: voter_id}, "voterId.enabled": {$eq: false}}, (err, result) => {
            if (err) throw new err 
            //meaning the user id is not enabled
            if(result.length != 0){
                data.updateOne({}, {$pull: {voterId: {id: {$eq: voter_id}}}}, (err, del) => {
                    if(err) throw new err 
                    return res.send({
                        status: true, 
                        msg: "Voter ID Deleted"
                    })
                })
            } else {
                return res.send({
                    status: false, 
                    msg: "Can't Delete Voter ID", 
                    text: "Voter ID is enabled"
                })
            }
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//search voter id 
adminrouter.post('/control/elections/voter-id/search-voter-id/', search_limit, isadmin, async (req, res, next) => {
    const { id } = req.body
    const voter_id = xs(id).toUpperCase()
    try {
        await data.find({ "voterId.student_id": { '$regex': '^' + voter_id, '$options': 'm' } }, {voterId: 1}, (err, result) => {
            if (err) throw new err
            if(result.length === 0){
                return res.send({
                    status: true,
                    data: []
                })     
            } else {
                return res.send({
                    status: true,
                    data: result[0].voterId
                })     
            }      
        })
    } catch (e) {
        return res.status(500).send()
    }
})
//sort
adminrouter.post('/control/elections/voter-id/sort-voter-id/', isadmin, normal_limit, async (req, res, next) => {
    const { srt } = req.body
    let sort, isJson
    //try if the sort value can be converted to json
    try {
        sort = JSON.parse(srt) 
        isJson = true
    } catch (e) {
        sort = xs(srt)
        isJson = false 
    }
    //check sort value
    try {
        if(!isJson){
            if (sort === "used" || sort === "not used") {
                let final_sort = false
                if (sort === "used") {
                    final_sort = true
                }

                //get all voter id that is already enabled
                await data.find({ "voterId.enabled": {$eq: final_sort} }, {voterId: 1}, (err, result) => {
                    if (err) throw new err
                    if(result.length === 0){
                        return res.send({
                            status: true,
                            data: []
                        })
                    } else {
                        return res.send({
                            status: true,
                            data: result[0].voterId
                        })
                    }
                })
            }
            if (sort === "default") {
                await data.find({}, {voterId: 1}, (err, result) => {
                    if (err) throw new err
                    if(result.length === 0){
                        return res.send({
                            status: true,
                            data: []
                        })
                    } else {
                        return res.send({
                            status: true,
                            data: result[0].voterId
                        })
                    }
                })
            }
        } else {
            const array_sort = sort
            let s = []
            //convert json to array
            for(let i in array_sort){
                s.push(i, array_sort[i])
            }
            //get sort value 
            if(s.length === 2){
                //check is fisrt index is equal to course 
                if(s[0] === "course"){
                    //sort all voter id with the given course
                    data.find({"voterId.course": {$eq: xs(s[1])}}, {voterId: 1}, (err, result) => {
                        if(err) throw new err 
                        if(result.length === 0){
                            return res.send({
                                status: true,
                                data: []
                            })
                        } else {
                            return res.send({
                                status: true,
                                data: result[0].voterId
                            })
                        }
                    })
                } else if(s[0] === "year") {
                    //sort all voter id with the given year
                    data.find({"voterId.year": {$eq: xs(s[1])}}, {voterId: 1}, (err, result) => {
                        if(err) throw new err 
                        if(result.length === 0){
                            return res.send({
                                status: true,
                                data: []
                            })
                        } else {
                            return res.send({
                                status: true,
                                data: result[0].voterId
                            })
                        }
                    })
                } else {
                    return res.send({
                        status: false,
                        msg: "Something went wrong"
                    })
                }
            } else {
                return res.send({
                    status: false,
                    msg: "Something went wrong"
                })
            }
        }
    } catch (e) {
        return res.status(500).send()
    }
})
//get voter id use for checking if voter ID is valid
adminrouter.post('/control/elections/voter-id/get-voter-id/', limit, isadmin, async (req, res, next) => {
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
adminrouter.post('/control/elections/voter-id/update-voter-id/', limit, isadmin, async (req, res, next) => {
    const { id, course, year } = req.body
    const voter_id_session = req.session.voter_id_to_update
    const student_id = xs(id).toUpperCase() // new student id
    const voter_course = xs(course)
    const voter_year = xs(year)
    //check if voter is exists
    try {
        await data.find({ "voterId.id": {$eq: voter_id_session} }, {voterId: 1}, (err, result_check) => {
            if (err) throw new err
            if (result_check.length === 0) {
                return res.send({
                    status: false,
                    msg: "Voter ID not found"
                })
            } else {
                //then check if the new student id is not used with another student id
                data.find({"voterId.student_id": {$eq: student_id}}, {voterId: 1}, (err, f) => {
                    if(err) throw new err 
                    if(f.length === 0){
                        //if all feilds is not empty
                        if(student_id !== "" && voter_course != "" && voter_year != ""){
                            data.updateOne({
                                "voterId.id": {$eq: voter_id_session}
                            }, {$set: {
                                "voterId.$.student_id": student_id, 
                                "voterId.$.course": voter_course, 
                                "voterId.$.year": voter_year, 
                            }}, (err, u) => {
                                if(err) throw new err
                                return res.send({
                                    status: true,
                                    msg: "Updated Successfully"
                                })
                            })
                        } else {
                            return res.send({
                                status: false,
                                msg: "Some feilds is empty"
                            })
                        }
                    } else {
                        return res.send({
                            status: false,
                            msg: "Voter ID is already in used"
                        })
                    }
                })
            }
        })
    } catch(e) {
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

//logs 
adminrouter.post('/control/logs/', isadmin, async (req, res) => {
    return res.render('control/forms/logs')
})
//get active voters 
adminrouter.post('/active_voters', isadmin, async (req, res) => {
    const { id } = req.body
    //check election id 
    await election.find({ _id: {$eq: id} }, { voters: 1 }, (err, elec) => {
        if (!err) {
            if (elec[0].voters.length == 0) {
                return res.send({
                    active: 0
                })
            }
            else {
                var count = 0
                //check all the voters if active 
                for (var i = 0; i < elec[0].voters.length; i++) {
                    //check if user is active 
                    user.find({ _id: elec[0].voters[i].id }, { socket_id: 1 }, (err, res_u) => {
                        if (res_u[0].socket_id != "Offline") {
                            count = count + 1
                        }
                    })
                }
                return res.send({
                    active: count
                })
            }
        }
    })
})
module.exports = adminrouter
