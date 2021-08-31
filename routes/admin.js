const express = require('express')
const adminrouter = express.Router()
const {isadmin} = require('./auth')
const user = require('../models/user')
const election = require('../models/election')
const data = require('../models/data')
const { search_limit, limit, normal_limit, delete_limit } = require('./rate-limit')
const {hash} = require('./functions')
const genpass = require('generate-password')
const xs = require('xss')
const { v4: uuid } = require('uuid')
const moment = require('moment')
/*##################################################################################### */

//elections data 
adminrouter.get('/control/elections', limit, isadmin, async (req, res) => {
    try {
        //get all courses, positions, & partylist 
        data.find({}, {positions: 1, course: 1, year: 1, partylists: 1}, (err, d) => {
            if(err) throw new err
            console.log(d)
            return res.render("control/forms/elections", {
                positions: d.length != 0 ? d[0].positions : [], 
                course: d.length != 0 ? d[0].course : [], 
                year: d.length != 0 ? d[0].year : [], 
                partylists: d.length != 0 ? d[0].partylists : []
            })
        })
    } catch(e){
        return res.status(500).send()
    }
})
//create election 
adminrouter.post('/control/elections/create-election', limit, isadmin, async (req, res) => {
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
        start_time = moment(start).startOf().fromNow().split(" "), 
        end_time = moment(end).startOf().fromNow().split(" ")
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
                            positions: pos, 
                            candidates: [], 
                            partylist: pty, 
                            voters: [], 
                            passcode: passcode, 
                            status: "Not Started", 
                            start: start, 
                            end: end, 
                            created: moment().format()
                        }, (err, crtd) => {
                            if(err) throw new err 
                            if(crtd){
                                return res.send({
                                    created: true, 
                                    msg: "Election Created Successfully", 
                                    data: {
                                        e_start: moment(start).startOf('hour').fromNow(),  
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
adminrouter.get('/control/elections/election-list/', limit, isadmin, async (req, res) => {
    //get all elections 
    await election.find({}, {passcode: 0}, (err, elecs) => {
        if(err) throw new err
        return res.render("control/forms/election_list", {elections: elecs})
    })
})
//get elections by id
adminrouter.get('/control/elections/id/:id', limit, isadmin, async (req, res) => {
    return res.render("control/forms/election_details")
})
/*##################################################################################### */

//positions 
adminrouter.post('/control/elections/positions/', isadmin, normal_limit, async (req, res, next) => {
    try {
        await data.find({}, { positions: 1 }, (err, pos) => {
            if (err) {
                throw new err
            }
            return res.render('control/forms/positions', { pos: pos.length === 0 ? [] : pos[0].positions})
        })
    } catch (e){
        return res.status(500).send()
    }
})
//add position
adminrouter.post('/control/elections/positions/add-position', isadmin, normal_limit, async (req, res) => {
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
adminrouter.post('/control/elections/voter-id/', normal_limit, isadmin, async (req, res) => {
    try {
        await data.find({}, {voterId: 1, course: 1, year: 1}, (err, data) => {
            if(err) throw new err
            if(data.length != 0){ 
                return res.render('control/forms/voter-id', { id: data[0].voterId, course: data[0].course, year: data[0].year})
            } else {
                return res.render('control/forms/voter-id', { id: [], course: [], year: []})
            }
        })
    } catch(e) {
        return res.status(500).send()
    }
})
//check voter id
adminrouter.post('/control/elections/voter-id/verify', isadmin, normal_limit, async (req, res) => {
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
        console.log(e)
        return res.status(500).send()
    }
})
//delete voter id 
adminrouter.post('/control/elections/voter-id/delete-voter-id/', isadmin, delete_limit, async (req, res, next) => {
    const { id } = req.body
    const voter_id = xs(id)

    //check voter id if not used
    try{
        await data.find({ "voterId.id": {$eq: voter_id} }, {"voterId.id": 1, "voterId.enabled": 1, _id: 0}, (err, result) => {
            if (err) throw new err 
            //check if the result is not empty
            if(result.length != 0 || result[0].voterId.length != 0){
                let v_id = result[0].voterId // array of voterid from query
                for(let i = 0; i < v_id.length; i++){
                    //check if voter id is not enabled
                    if(voter_id === v_id[i].id && !v_id[i].enabled){
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
                            msg: "Voter ID is in used"
                        })
                    }
                }
            } else {
                return res.send({
                    status: false, 
                    msg: "Voter ID not found"
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
            console.log(result)
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
                    console.log(student_id)
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
adminrouter.post('/control/elections/course&year/', limit, isadmin, async (req, res) => {
    try {
        await data.find({}, {course: 1, year: 1}, (err, data) => {
            if(err){
                throw new err
            } else {
                return res.render('control/forms/cy', { cy: data })
            }
        })
    } catch(e){
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
                                console.log(n)
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
            await data.find({"course.type": {$eq: xs(course).toUpperCase()}, "year.type": {$eq: xs(year)}}, (err, f) => {
                if(err){
                    throw new err
                }
                if(!err){
                    if(f.length === 0){
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
                }
            })
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
            if(err){
                return res.send({
                    status: false, 
                    msg: "Internal Error!"
                })
            }
            if(!err){
                if(f.length !== 0){
                    //check if the new course is already in used or not 
                    data.find({"course.type": {$eq: xs(new_course).toUpperCase()}}, (err, t) => {
                        if(err){
                            return res.send({
                                status: false, 
                                msg: "Internal Error!"
                            })
                        }
                        if(!err){
                            if(t.length == 0){
                                //update course 
                                data.updateOne({"course.id": {$eq: xs(id)}}, {$set: {"course.$.type": xs(new_course).toUpperCase()}}, (err, up_c) => {
                                    if(err){
                                        return res.send({
                                            status: false, 
                                            msg: "Internal Error!"
                                        })
                                    }
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
adminrouter.post('/control/elections/partylist', normal_limit, isadmin, async (req, res) => {
    try {
        await data.find({}, {partylists: 1}, (err, p) => {
            if(err){
                throw new err
            } else {
                if(p.length === 0){
                    return res.render("control/forms/partylist", {partylist: []})
                } else {
                    return res.render("control/forms/partylist", {partylist: p[0].partylists})
                }
            }
        })
    } catch (e){
        return res.status(500).send()
    }
})
//add partylist 
adminrouter.post('/control/elections/partylist/add-partylist', normal_limit, isadmin, async (req, res) => {
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
adminrouter.post('/control/elections/partylist/delete-partylist', delete_limit, isadmin, async (req, res) => {
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
adminrouter.post('/control/elections/partylist/update-partylist', normal_limit, isadmin, async (req, res) => {
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
//create election 
adminrouter.post('/control/create_election', isadmin, async (req, res) => {
    await election.find({}, (err, elections) => {
        return res.render('control/forms/create_election', { elections: elections })
    })
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
