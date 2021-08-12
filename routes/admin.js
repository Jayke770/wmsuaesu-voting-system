const express = require('express')
const adminrouter = express.Router()
const { authenticated, isadmin, isloggedin } = require('./auth')
const user = require('../models/user')
const ids = require('../models/student-id')
const election = require('../models/election')
const data = require('../models/data')
const pass_gen = require('generate-password')
const xs = require('xss')
const { v4: uuid } = require('uuid')
const rate_limit = require('express-rate-limit')
const search_limit = rate_limit({
    windowMs: 1*60*1000, 
    max: 10,
})
const limit = rate_limit({
    windowMs: 1*60*1000, 
    max: 5,
})
adminrouter.post('/check', isadmin, async (req, res) => {
    const { id } = req.body
    if (id.trim() != "") {
        await ids.find({ student_id: id }, function (err, doc) {
            if (doc.length == 1) {
                return res.send({
                    isvalid: false,
                    msg: "Student ID Is Already Added"
                })
            }
            return res.send({
                isvalid: true,
                msg: ""
            })
        })
    }
})

adminrouter.post('/ids', isadmin, async (req, res) => {
    await ids.find({}, { _id: 0 }, function (err, list_ids) {
        return res.send({
            student_ids: list_ids
        })
    })
})
adminrouter.post('/find-id', isadmin, async (req, res) => {
    const { id } = req.body
    await ids.find({ student_id: { '$regex': '^' + id, '$options': 'i' } }, { _id: 0 }, function (err, res_ids) {
        return res.send({
            result: res_ids
        })
    })
})
adminrouter.post('/sort-id', isadmin, async (req, res) => {
    const { sort } = req.body
    if (sort == 'df') {
        await ids.find({}, { _id: 0 }, function (err, sort) {
            return res.send({
                sort: sort
            })
        })
    }
    else {
        await ids.find({ course: sort }, { _id: 0 }, function (err, sort) {
            return res.send({
                sort: sort
            })
        })
    }
})

//add, update, delete student id
adminrouter.post('/add-id', isadmin, async (req, res) => {
    const { id, course, yr } = req.body
    //check if not empty 
    if (id.trim() != "" && course.trim() != "" && yr.trim() != "") {
        //find the current if 
        await ids.find({ student_id: id }, { _id: 0, course: 0, year: 0, enabled: 0 }, function (err, res_find) {
            if (res_find.length != 0) {
                //means student id is already added
                return res.send({
                    add: false,
                    msg: "ID is already inused"
                })
            }
            ids.create({ student_id: id, course: course, year: yr, enabled: false }, function (err, inserted) {
                //means student id is added
                return res.send({
                    add: true,
                    msg: "ID Successfully Added"
                })
            })
        })
    }
})
adminrouter.post('/delete-id', isadmin, async (req, res) => {
    const { id } = req.body
    if (id.trim() != "") {
        //check if the current id is not enabled
        await ids.find({ student_id: id }, function (err, doc) {
            if (doc.length != 0) {
                if (!doc[0].enabled) {
                    //if result is = 0, meanswla pa na na enabled or nagamit sa student/voter
                    //then remove the student id
                    ids.deleteOne({ student_id: id }, function (err, del_doc) {
                        if (err) {
                            return res.send({
                                del: false,
                                msg: "Internal Error"
                            })
                        }
                        else {
                            return res.send({
                                del: true,
                                msg: "Deleted Successfully"
                            })
                        }
                    })
                }
                else {
                    return res.send({
                        del: false,
                        msg: "Cant Delete ID is enabled!"
                    })
                }
            }
            else {
                return res.send({
                    del: false,
                    msg: "Cannot find that ID"
                })
            }
        })
    }
    else {
        return res.send({
            del: false,
            msg: "All feilds is required!"
        })
    }
})
adminrouter.post('/update-id', isadmin, async (req, res) => {
    const { id, course, yr } = req.body
    //check the inputs 
    if (id.trim() != "" && course.trim() != "" && yr.trim() != "") {
        //check if id is not inserted before 
        await ids.find({ student_id: id }, function (err, naa) {
            if (naa.length == 1) {
                //meaning waala pwede ra esulod ang id
                ids.updateOne({ student_id: id }, { student_id: id, course: course, year: yr, enabled: false }, function (err, update) {
                    if (err) {
                        return res.send({
                            up: false,
                            msg: "Internal Error"
                        })
                    }
                    else {
                        return res.send({
                            up: true,
                            msg: "ID updated successfully"
                        })
                    }
                })
            }
            else {
                return res.send({
                    up: false,
                    msg: "Cannot Find That ID"
                })
            }
        })
    }
    else {
        return res.send({
            del: false,
            msg: "All feilds is required!"
        })
    }
})

//create, update, delete elections
adminrouter.post('/elections', isadmin, async (req, res) => {
    await election.find({}, function (err, elections) {
        res.send({
            election: elections
        })
    })
})
adminrouter.post('/find-election', isadmin, async (req, res) => {
    const { title } = req.body
    await election.find({ election_title: { '$regex': '^' + title, '$options': 'i' } }, function (err, res_elec) {
        res.send({
            election: res_elec
        })
    })
})
adminrouter.post('/create-election', isadmin, async (req, res) => {
    var { elec_name, position, max_vote, course, partylist } = req.body
    //check the array length of position and max vote
    if (elec_name != "") {
        if (position.length == max_vote.length || position != '' && max_vote != '') {  //if the positions and max_vote is  equal 
            //combine position and max_vote into json
            if (typeof position == 'string') {
                //if theres only one position created
                var ps = [{ name: position, max_vote: max_vote }]
            }
            else {
                var ps = []
                for (var x = 0; x < position.length; x++) {
                    //push to array
                    ps.push({ name: position[x], max_vote: max_vote[x] })
                }
            }

            //check the partylist index if contains null index
            var c_ = false, p_ = false
            //we use looping and c, p variables to prevent server error during the process
            for (let p = 0; p < partylist.split(",").length; p++) {
                if (partylist.split(",")[p] == "") {
                    p_ = true
                    break
                }
            }
            for (let c = 0; c < course.split(",").length; c++) {
                if (course.split(",")[c] == "") {
                    c_ = true
                    break
                }
            }

            //check if c and p variable is true
            if (!c_ && !p_) { // if  all is  true, and no index is empty
                //save the new election in db
                const valid_courses = course.split(",")
                const valid_positions = ps
                const valid_partylist = partylist.split(",")
                const passcode = pass_gen.generate({
                    length: 5,
                    uppercase: false,
                    numbers: true
                })
                //check if election name if not taken or in used
                await election.find({ election_title: elec_name }, (err, match) => {
                    //if not taken
                    if (match.length == 0) {
                        election.create({
                            election_title: elec_name,
                            courses: valid_courses,
                            positions: valid_positions,
                            partylist: valid_partylist.push("Independent"),
                            passcode: passcode
                        }, (err, doc) => {
                            // if save
                            if (err) {
                                res.send({
                                    created: false,
                                    msg: 'Internal Error',
                                })
                            }
                            res.send({
                                created: true,
                                msg: 'Election Created',
                                code: doc.passcode
                            })
                        })
                    }
                    else {
                        res.send({
                            created: false,
                            msg: 'Election Name already in used',
                        })
                    }
                })

            }
            else {
                res.send({
                    created: false,
                    msg: 'Some Index is empty',
                })
            }
        }
        else {
            res.send({
                created: false,
                msg: 'Empty Position & Max Vote'
            })
        }
    }
    else {
        res.send({
            created: false,
            msg: 'Election Title is empty'
        })
    }
})
adminrouter.post('/election-passcode', isadmin, async (req, res) => {
    const { id } = req.body
    await election.find({ _id: id }, { passcode: 1 }, (err, id_res) => {
        res.send({
            data: id_res
        })
    })
})
adminrouter.post('/delete-election', isadmin, async (req, res) => {
    const { id } = req.body
    await election.findOneAndDelete({ _id: id }, (err, del_doc) => {
        if (err) {
            return res.send({
                deleted: false,
                msg: "Failed to Delete"
            })
        }
        else {
            return res.send({
                deleted: true,
                msg: "Deleted Successfully"
            })
        }
    })
})
//get list of all voters
adminrouter.get('/control/voters', async (req, res) => {
    return res.render("control/forms/voters")
})
//election details
adminrouter.get('/control/election', async (req, res) => {
    return res.render("control/forms/election_details")
})
//voter id
adminrouter.get('/control/voter-id/', isadmin, async (req, res, next) => {
    await ids.find({}, (err, res_id) => {
        if(err){
            //send error code
            return next()
        }
        if(!err){
            return res.render('control/forms/voter-id', {id: res_id})
        }
    })
})
//positions 
adminrouter.get('/control/positions', isadmin, async (req, res, next) => {
    await data.find({}, {positions: 1}, (err, pos) => {
        if(err){
            //send error page
            return next()
        }
        if(!err){
            return res.render('control/forms/positions', {pos: pos})
        }
    })
})
adminrouter.post('/control/positions/add-position', isadmin, async (req, res, next) => {
    const {position} = req.body 
    const new_pos = {
        id: uuid(), 
        type: xs(position)
    }
    try {
        //find if position is exists 
        await data.find({'positions.type': xs(position)}, (err, pos) => {
            if(err){
                return res.send({
                    done: false, 
                    msg: "Internal Error!"
                })
            }
            if(!err){
                if(pos.length === 1){
                    return res.send({
                        done: false, 
                        msg: 'Position already exists'
                    })
                }
                if(pos.length === 0){
                    //check if position feild is empty 
                    data.find({}, (err, datas) => {
                        if(err){
                            return res.send({
                                done: false, 
                                msg: "Internal Error"
                            })
                        }
                        if(!err){
                            if(datas.length !== 0){
                                //insert new position 
                                data.updateOne({$push: {positions: new_pos}}, (err, inserted_pos) => {
                                    if(err){
                                        console.log(err)
                                        return res.send({
                                            done: false, 
                                            msg: "Internal Error!"
                                        })
                                    }
                                    if(!err){
                                        return res.send({
                                            done: true, 
                                            msg: "Position Added Successfully!",
                                            data: new_pos
                                        })
                                    }
                                })
                            } 
                            else{
                                //insert new position 
                                data.create({position: new_pos}, (err, created) => {
                                    if(err){
                                        return res.send({
                                            done: false, 
                                            msg: "Internal Error!"
                                        })
                                    }
                                    if(!err){
                                        //insert new position 
                                        data.updateOne({$push: {positions: new_pos}}, (err, inserted_pos) => {
                                            if(err){
                                                console.log(err)
                                                return res.send({
                                                    done: false, 
                                                    msg: "Internal Error!"
                                                })
                                            }
                                            if(!err){
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
        return res.send({
            done: false, 
            msg: "Internal Error!"
        })
    }
})
//check voter id
adminrouter.post('/control/voter-id/', isadmin, async (req, res, next) => {
    const {id} = req.body 
    const voter_id = xs(id)
    //check voter if exists 
    await ids.find({student_id: voter_id}, (err, res_id) => {
        if(err){
            //send error page
        }
        if(!err){
            if(res_id.length === 0){
                return res.send({
                    status: true, 
                    msg: "Okay"    
                })
            } 
            else{
                return res.send({
                    status: false, 
                    msg: "Voter ID is already exist"
                })
            }
        }
    })
})
//add voter id
adminrouter.post('/control/voter-id/add-voter-id/', isadmin, async (req, res, next) => {
    const {id, crs, year} = req.body
    const voter_id = xs(id)
    const voter_crs = xs(crs)
    const voter_year = xs(year) 
    
    //check id 
    await ids.find({student_id: voter_id}, (err, res_find) => {
        if(err){
            //send error
        }
        if(!err){
            if(res_find.length === 0){
                ids.create({
                    student_id: voter_id, 
                    course: voter_crs, 
                    year: voter_year, 
                    enabled: false
                }, (err, inserted) => {
                    if(err){
                        return res.send({
                            status: false,
                            msg: "Something went wrong"
                        })
                    }
                    else{
                        return res.send({
                            status: true, 
                            data: inserted, 
                            msg: "Voter ID Added"
                        })
                    }
                })
            }
            else{
                return res.send({
                    status: false,
                    msg: "Voter ID is already exist"
                })
            }
        }
    })
})
//delete voter id 
adminrouter.post('/control/voter-id/delete-voter-id/', isadmin, async (req, res, next) => {
    const {id} = req.body
    const voter_id = xs(id)
    
    //check voter id if not used
    await ids.find({_id: voter_id}, (err, result) => {
        if(err){
            //send error page 
            return next()
        }
        if(!err){
            if(result.length === 0){
                return res.send({
                    status: false, 
                    msg: "Voter ID not found"
                })
            }
            if(result.length !== 0){
                //check if id is not used 
                if(result[0].enabled){
                    return res.send({
                        status: false, 
                        msg: "Voter ID is in used"
                    })
                }
                if(!result[0].enabled){
                    //delete id 
                    ids.deleteOne({_id: voter_id}, (err, is_deleted) => {
                        if(err){
                            //send error page 
                            return next()
                        }
                        if(!err){
                            return res.send({
                                status: true, 
                                id_deleted: voter_id,
                                msg: "Voter ID deleted successfully"
                            })
                        }
                    })
                }
            }
        }
    })
})
//search voter id 
adminrouter.post('/control/voter-id/search-voter-id/', search_limit, isadmin, async (req, res, next) => {
    const {data} = req.body 
    const voter_id = xs(data)
    
    //search voter id provided by voter_id variable
    if(voter_id === ""){
        await ids.find({}, (err, result) => {
            if(err){
                // send error page 
                return next()
            }
            if(!err){
                return res.send({
                    status: true, 
                    data: result
                })
            }
        })
    }
    else{
        await ids.find({ student_id: { '$regex': '^' + voter_id, '$options': 'm' } }, (err, result) => {
            if(err){
                // send error page 
                return next()
            }
            if(!err){
                return res.send({
                    status: true, 
                    data: result
                })
            }
        })
    }
})
//sort
adminrouter.post('/control/voter-id/sort-voter-id/', isadmin, async (req, res, next) => {
    const {data} = req.body 
    const sort = xs(data)
    
    //check sort value
    if(sort === "used" || sort === "not used"){
        let final_sort = false
        if(sort === "used"){
            final_sort = true
        }
        
        //get all voter containing with the sort value 
        await ids.find({enabled: final_sort}, (err, result) => {
            if(err){
                //send error page 
                return next()
            }
            if(!err){
                return res.send({
                    status: true, 
                    data: result
                })
            }
        })
    }
    else if(sort === "default"){
        await ids.find({}, (err, result) => {
            if(err){
                //send error page 
                return next()
            }
            if(!err){
                return res.send({
                    status: true, 
                    data: result
                })
            }
        })
    }
    else{
        await ids.find({course: sort}, (err, result) => {
            if(err){
                //send error page 
                return next()
            }
            if(!err){
                return res.send({
                    status: true, 
                    data: result
                })
            }
        })
    }
})
//get voter id 
adminrouter.post('/control/voter-id/get-voter-id/', limit, isadmin, async (req, res, next) => {
    const {data} = req.body 
    const voter_id = xs(data)

    //get voter id 
    await ids.find({_id: voter_id}, (err, result) => {
        if(err){
            //send error page 
            return next()
        }
        if(!err){
            if(result.length === 0){
                return res.send({
                    status: false, 
                    msg: "Voter ID not found"
                })
            }
            if(result.length !== 0){
                //set session to determine that this voter id is ready to update 
                req.session.voter_id_to_update = result[0]._id
                return res.send({
                    status: true, 
                    data: result
                })
            }
        }
    })
})
//update voter id 
adminrouter.post('/control/voter-id/update-voter-id/', limit, isadmin, async (req, res, next) => {
    const {id, course, year} = req.body 
    const voter_id_session = req.session.voter_id_to_update
    const voter_id = xs(id)
    const voter_course = xs(course)
    const voter_year = xs(year)

    //check if voter is exists
    await ids.find({_id: voter_id_session}, (err, result_check) => {
        if(err){
            //send error page 
            return next()
        }
        if(!err){
           if(result_check.length === 0){
               return res.send({
                   status: false, 
                   msg: "Voter ID not found"
               })
           }
           if(result_check.length !== 0){
               //then check if the new voter id is not the with another voter id
               ids.find({student_id: voter_id}, (err, result) => {
                   if(err){
                       //send error page 
                        return next()
                   }
                   if(!err){
                       if(result.length === 0){
                           //update voter id
                           ids.updateOne({_id: voter_id_session}, {student_id: voter_id, course: voter_course, year: voter_year}, (err, isUpdated) => {
                               if(err){
                                   //send error page 
                               }
                               if(!err){
                                    const new_data = {
                                        _id: voter_id_session, 
                                        student_id: voter_id, 
                                        course: voter_course, 
                                        year: voter_year
                                    }
                                    console.log(new_data)
                                    return res.send({
                                        status: true,
                                        msg: "Voter ID updated successfully",
                                        data: new_data
                                    })
                               }
                           })
                       }
                       else{
                           return res.send({
                               status: false, 
                               msg: "Something went wrong", 
                               msg2: "Voter ID is already used before or used by another voter"
                           })
                       }
                   }
               })
           }
        }
    })
})
//logs 
adminrouter.post('/control/logs/', isadmin, async (req, res) => {
    return res.render('control/forms/logs')
})
//create election 
adminrouter.post('/control/create_election', isadmin, async (req, res) => {
    await election.find({}, (err, elections) => {
        return res.render('control/forms/create_election', {elections: elections})
    })
})
//get active voters 
adminrouter.post('/active_voters', isadmin, async (req, res) => {
    const {id} = req.body
    //check election id 
    await election.find({_id: id}, {voters: 1}, (err, elec) => {
        if(!err){
            if(elec[0].voters.length == 0){
                return res.send({
                    active: 0
                })
            }
            else{
                var count = 0
                //check all the voters if active 
                for(var i = 0; i < elec[0].voters.length; i++){
                    //check if user is active 
                    user.find({_id: elec[0].voters[i].id}, {socket_id: 1}, (err, res_u) => {
                        if(res_u[0].socket_id != "Offline"){
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