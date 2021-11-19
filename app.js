if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const express = require('express')
const app = express()
const port = process.env.PORT || 8989
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const path = require('path')
const session = require('express-session')
const mongoose = require('mongoose')
const mongodbstore = require('connect-mongodb-session')(session)
const morgan = require('morgan')
const helmet = require('helmet')
const cors = require('cors')
const xs = require('xss')
const csrf = require('csurf')
const chokidar = require('chokidar')
const cookieParser = require('cookie-parser')
const rfs = require('rotating-file-stream')
const sharedsession = require('express-socket.io-session')
const requestIp = require('request-ip')
const fs = require('fs-extra')
const moment = require('moment-timezone')
const {v4: uuidv4} = require('uuid')
const nl2br = require('nl2br')
const sys = require('systeminformation')
const hr = require('@tsmx/human-readable') 
const route = require('./routes/index')
const admin = require('./routes/admin')
const uploader = require('./routes/uploader')
const {updateAdminSocketID, user_socket_id, election_handler, user_data, users_election_handler, course, mycourse, year, myyear, newNotification} = require('./routes/functions') 
//models 
const election = require('./models/election')
const users = require('./models/user')
const conversations = require('./models/conversations')

mongoose.connect(process.env.db_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const store = new mongodbstore({
    uri: process.env.db_url,
    collection: 'sessions'
})

store.on('error', (err) => {
    console.log(err)
})
const dir = path.join(__dirname, './public')
const log_stream = rfs.createStream('logs.log', {
    interval: '1d',
    path: path.join(__dirname, 'log')
})
const appsession = session({
    name: "wmsu-session-id",
    secret: process.env.session_secret,
    expires: 1000 * 60 * 60 * 24,
    cookie: {
       maxAge: 1000 * 60 * 60 * 24 * 1, 
       httpOnly: true, 
       sameSite: 'strict'
    },
    store: store,
    resave: true,
    saveUninitialized: true,
    connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
    }
})
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
)
app.use(morgan(':status :remote-addr :method :url :response-time ms <br>', { stream: log_stream }))
app.use(express.static(dir))
app.use(requestIp.mw())
app.use(express.urlencoded({ extended: false }))
app.use(express.json()) // json
app.use(uploader)
app.use(cors())
app.set('view engine', 'ejs')
if(app.get('env') === 'production'){
    app.set('trust proxy', 1)
}
app.use(cookieParser())
app.use(csrf({cookie: true}))
app.use(appsession)
app.use(route) //all user req
app.use(admin) //all admin req 
//http 404 req
app.use(function(req, res) { 
    return req.method === "GET" ? res.status(404).render('error/404') : res.status(404).send()
})
io.use(sharedsession(appsession, {
    autoSave: true,
    resave: true, 
    saveUninitialized: true
}))
//socket.io admin & user namespace 
const admin_socket = io.of("/admin")
const users_socket = io.of("/users") 
admin_socket.use(sharedsession(appsession, {
    autoSave: true,
    resave: true, 
    saveUninitialized: true
}))
users_socket.use(sharedsession(appsession, {
    autoSave: true,
    resave: true, 
    saveUninitialized: true
}))
//admin websocket events
admin_socket.on('connection', async (socket) => {
    let {myid, currentElection, user_type, islogin} = socket.handshake.session
    //update admin socket id every connection
    if(islogin !== "okay" && user_type !== "Admin"){
        socket.disconnect()
    } else {
        updateAdminSocketID(myid, socket.id)
        admin_socket_id = socket.id
        console.log("Admin Connected with soket Id of ", socket.id)
    }
    //election events
    //if admin requests updated data of election 
    socket.on('election-data', async (data, res) => {
        let new_election_data = {
            voters: {
                accepted: 0, 
                pending: 0, 
                voted: 0, 
                total: 0
            },
            candidates: {
                accepted: 0, 
                pending: 0, 
                deleted: 0, 
                total: 0
            },
            partylists: 0, 
            positions: 0
        }
        try {
            await election.find({_id: {$eq: xs(data.id)}}).then( (elec) => {
               if(elec.length !== 0){
                    const election = elec.length === 0 ? [] : elec[0]
                    //accepeted voters 
                    for(let i = 0; i < election.voters.length; i++){
                        if(election.voters[i].status === 'Accepted'){
                            new_election_data.voters.accepted += 1
                        }
                        if(election.voters[i].status === 'Pending'){
                            new_election_data.voters.pending += 1
                        }
                        if(election.voters[i].isvoted){
                            new_election_data.voters.voted += 1
                        }
                    } 
                    //accepeted candidates 
                    for(let i = 0; i < election.candidates.length; i++){
                        if(election.candidates[i].status === 'Accepted'){
                            new_election_data.candidates.accepted += 1
                        }
                        if(election.candidates[i].status === 'Pending'){
                            new_election_data.candidates.pending += 1
                        }
                        if(election.candidates[i].status === 'Deleted'){
                            new_election_data.candidates.deleted += 1
                        }
                    } 
                    new_election_data.candidates.total = election.candidates.length
                    new_election_data.voters.total = election.voters.length
                    new_election_data.partylists = election.partylist.length
                    new_election_data.positions = election.positions.length
                    res({
                        status: true, 
                        data: new_election_data
                    })
               } else {
                    res({
                        status: false, 
                        data: new_election_data
                    })
               }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e){
            res({
                status: false, 
                msg: 'error'
            })
        }
    })
    socket.on('voter-accepted', async (data) => {
       //get voter socket id  
       await users.find({_id: {$eq: xs(data.voterID)} }, {socket_id: 1}).then( (v) => {
            const socket_id = v.length === 0 ? '' : v[0].socket_id 
            if(socket_id !== ''){
                users_socket.to(socket_id).emit('voter-accepted', {electionID: currentElection})
            }
        })
    })
    socket.on('candidacy-form-accepted', async (data) => {
        try {
            //get candidate information 
            await election.find({
                _id: {$eq: xs(currentElection)}, 
                candidates: {$elemMatch: {id: {$eq: xs(data.candidacyID)}}}
            }, {candidates: {$elemMatch: {id: {$eq: xs(data.candidacyID)}}}}).then( async (ca) => {
                const student_id = ca.length === 0 ? '' : ca[0].candidates[0].student_id  
                const socket_id = await user_socket_id(student_id)
                if(socket_id !== false){
                    users_socket.to(socket_id).emit('candidacy-accepted', {candidacyID: data.candidacyID})
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            console.log(e)
        }
    })
    socket.on('elections', async (res) => {
        res({
            elections: await election.countDocuments()
        })
    })
    //send event to all user in this election that dome information of election is change 
    socket.on('election-change', async (data) => {
        //get all voters in this election
        try {
            await election.find({
                _id: {$eq: xs(currentElection)}
            }, {voters: 1}).then( async (elec) => {
                if(elec.length > 0){
                    for(let i = 0; i < elec[0].voters.length; i++){
                        //get socket id of voter 
                        await users.find({
                            student_id: {$eq: xs(elec[0].voters[i].student_id)}
                        }, {socket_id: 1}).then( (sid) => {
                            if(sid.length > 0){
                                if(sid[0].socket_id !== "Offline" || sid[0].socket_id !== "Waiting For Student"){
                                    users_socket.to(sid[0].socket_id).emit('election-changed', {electionID: xs(data.electionID)})
                                }
                            }
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    }
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            console.log(e)
        }
    })
    socket.on('disconnect', () => {
        console.log("Admin Disonnected with soket Id of ", socket.id)
        updateAdminSocketID(myid, "Offline")
    })
    //election candidate names
    socket.on('candidate-names', async (data, res) => {
        let ca_data = {
            names: [], 
            votes: []
        }
        try {
            //get election 
            await election.find({
                _id: {$eq: xs(data.id)}
            }, {candidates: 1}).then( async (elec) => {
                if(elec.length > 0){
                    //get all candidates that match in the sent position 
                    const candidates = elec[0].candidates 
                    for(let c = 0; c < candidates.length; c++){
                        if(candidates[c].position === xs(data.position) && candidates[c].status === "Accepted"){
                            ca_data.names.push(candidates[c].fullname.split(" ")[0])
                            ca_data.votes.push(candidates[c].votes.length)
                        }
                    }
                    res({
                        status: true, 
                        data: ca_data
                    })
                } else {
                    res({
                        status: false, 
                        data: ca_data
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e){
            res({
                status: false, 
                data: ca_data
            })
        }
    }) 
    //election courses 
    socket.on('get-courses', async (res) => {
        let e_courses = [] 
        await election.find({
            _id: {$eq: xs(currentElection)}
        }, {courses: 1}).then( async (elec) => {
            if(elec.length > 0){
                for(let c = 0; c < elec[0].courses.length; c++){
                    e_courses.push(await mycourse(elec[0].courses[c]))
                }
                res({
                    status: true, 
                    data: e_courses
                })
            }
        }).catch( (e) => {
            res({
                status: false, 
                data: e.message
            })
        })
    })
    //election year
    socket.on('get-year', async (res) => {
        let e_year = [] 
        await election.find({
            _id: {$eq: xs(currentElection)}
        }, {year: 1}).then( async (elec) => {
            if(elec.length > 0){
                for(let y = 0; y < elec[0].year.length; y++){
                    e_year.push(await myyear(elec[0].year[y]))
                }
                res({
                    status: true, 
                    data: e_year
                })
            }
        }).catch( (e) => {
            res({
                status: false, 
                data: e.message
            })
        })
    })
    //total election voters & voters active 
    socket.on('election-voters-total', async (data, res) => {
        const {id} = data 
        try {
            await election.find({
                _id: {$eq: xs(id)}
            }, {voters: 1}).then( async (elec) => {
                if(elec.length > 0){
                    const voters = elec[0].voters
                    let online_voters = 0
                    for(let v = 0; v < voters.length; v++){
                        await users.find({
                            student_id: {$eq: xs(voters[v].student_id)}
                        }, {socket_id: 1}).then( (status) => {
                            if(status.length > 0){
                                status[0].socket_id !== "Offline" ? online_voters += 1 : online_voters = online_voters
                            }
                        }).catch( (e) => {
                            throw new Error(e)
                        })
                    }
                    res({
                        status: true, 
                        data: {
                            voters: voters.length, 
                            active_voters: online_voters
                        }
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e){
            res({
                status: false, 
                data: e.message
            })
        }
    })
    //send notification 
    socket.on('send-notification', async (data, res) => {
        const status = await user_socket_id(data.student_id)
        if(status !== "Offline"){
            users_socket.to(status).emit('new_notification')
        }
    })  
    //get server information 
    socket.on('server-info', async (res) => {
        const system = {
            os: await sys.osInfo(), 
            cpu: await sys.cpu(), 
            memory: await sys.mem(), 
            disk: await sys.diskLayout()
        }
        res({
            os: `${system.os.distro} ${system.os.release} ${system.os.codename} ${system.os.arch}`, 
            cpu: `${system.cpu.manufacturer} ${system.cpu.brand} ${system.cpu.speedMax}GHz ${system.cpu.cores} Cores`, 
            memory: `Used ${hr.fromBytes(system.memory.used, { fullPrecision: true })}  / Total ${hr.fromBytes(system.memory.total, { fullPrecision: true })}`, 
            storage: system.disk
        })
    })
})
//user websocket events
users_socket.on('connection', async (socket) => {
    let {myid, electionID, islogin, user_type, device, chat} = socket.handshake.session 
    const {student_id} = await user_data(myid)
    //update socket id every user connted to server 
    if(islogin && user_type === "Voter"){
        await users.updateOne({
            _id: {$eq: xs(myid)}, 
            "devices.id": {$eq: xs(device)}
        }, {$set: {
            socket_id: socket.id, 
            "devices.$.status": 'Online', 
            last_seen: ''
        }}).then( async () => {
            const kachat = await user_data(chat)
            socket.to(kachat.socket_id).emit('kachat-reconnect')
            console.log("New User Connected with soket Id of ", socket.id,)
            admin_socket.emit('connected', {id: xs(myid)})
        })
    } else {
        socket.disconnect()
    }
    socket.on('disconnect', async () => {
        const kachat = await user_data(chat)
        const socket_id = socket.id
        await users.updateOne({
            _id: {$eq: xs(myid)}, 
            "devices.id": {$eq: xs(device)}
        }, {$set: {
            socket_id: 'Offline', 
            "devices.$.status": 'Offline',
            last_seen: moment().tz("Asia/Manila").format()
        }}).then( async () => {
            socket.to(kachat.socket_id).emit('kachat-disconnect')
            console.log("New User Diconnected with soket Id of ", socket_id)
            admin_socket.emit('user-disconnected', {id: xs(myid)})
        })
    })
    //election events 
    socket.on('success-join-election', async (data) => {
        //notify all admins that their is new voter attempt to join the election 
        admin_socket.emit('new-user-join-election', {id: myid, election: data.electionID})
    })
    //if user file for candidacy 
    socket.on('file-candidacy', (data) => {
        admin_socket.emit('new-voter-file-for-candidacy', {id: myid, election: electionID})
    })
    //get election data 
    socket.on('election-status', async (data, res) => {
        let electionStatus = {
            id: data.electionID,
            election: {
                status: '', 
                title: ''
            }, 
            voters: {
                total: 0,
                status: ''
            }
        }
        try {
            await election.find({
                _id: {$eq: xs(data.electionID)}, 
                voters: {$elemMatch: {student_id: {$eq: xs(student_id)}}}
            }, {voters: 1, status: 1, election_title: 1}).then( (elec) => {
                const e_data = elec.length === 0 ? [] : elec[0].voters
                electionStatus.election.title = elec.length === 0 ? '' : elec[0].election_title
                //get voter status 
                if(e_data.length !== 0){
                    for(let i = 0; i < e_data.length; i++){
                        if(e_data[i].student_id === student_id){
                            electionStatus.voters.status = e_data[i].status
                            break
                        }
                    }
                    electionStatus.voters.total = elec.length === 0 ? 0 : elec[0].voters.length
                    electionStatus.election.status = elec.length === 0 ? '' : elec[0].status
                    res({
                        status: true, 
                        data: electionStatus
                    })
                } else {
                    res({
                        status: false,
                        data: {}
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            console.log(e)
            res({
                status: false, 
                data: {},
                msg: "Something went wrong"
            })
        }
    })
    //candiates total reactions & views 
    socket.on('candidates-reactions&views', async (res) => {
        try {
            //get all candidates reaction & views 
            await election.find({
                _id: {$eq: xs(electionID)}
            }, {"candidates.id": 1, "candidates.reactions": 1, "candidates.views": 1}).then( (elec) => {
                res({
                    status: true, 
                    candidates: elec[0].candidates
                })
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            res({
                status: false, 
                msg: "Internal Error"
            })
        }
    })
    //email status 
    socket.on('email-status', async (res) => {
        const {email} = await user_data(myid) 
        if(email.status === "Verified") {
            res({status: true})
        }
        if(email.status === "Not Verified") {
            res({status: false})
        }
    })
    //device status 
    socket.on('device-status', async (data, res) => {
        const {devices} = await user_data(myid) 
        let device_status = false
        for(let i = 0; i < devices.length; i++){
            if(devices[i].id === data.id && devices[i].verified){
                device_status = true
                break
            }
        }
        res({
            status: device_status
        })
    })
    //election candidate names
    socket.on('candidate-names', async (data, res) => {
        let ca_data = {
            names: [], 
            votes: []
        }
        try {
            //get election 
            await election.find({
                _id: {$eq: xs(data.id)}
            }, {candidates: 1}).then( async (elec) => {
                if(elec.length > 0){
                    //get all candidates that match in the sent position 
                    const candidates = elec[0].candidates 
                    for(let c = 0; c < candidates.length; c++){
                        if(candidates[c].position === xs(data.position) && candidates[c].status === "Accepted"){
                            ca_data.names.push(candidates[c].fullname)
                            ca_data.votes.push(candidates[c].votes.length)
                        }
                    }
                    res({
                        status: true, 
                        data: ca_data
                    })
                } else {
                    res({
                        status: false, 
                        data: ca_data
                    })
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e){
            res({
                status: false, 
                data: ca_data
            })
        }
    }) 
    //send message 
    socket.on('send-message', async (data, res) => {
        const {message, kachatid} = data
        const {firstname, middlename, lastname, student_id} = await user_data(myid) 
        const new_msg = {
            id: uuidv4(), 
            firstname: firstname, 
            fullname: `${firstname} ${middlename} ${lastname}`,
            userid: xs(myid).toString(), 
            message: nl2br(xs(message)), 
            created: moment().tz("Asia/Manila").format()
        }

        try {
            await conversations.find({
                $and: [
                    {"userIDs.id": {$eq: xs(chat ? chat : kachatid)}}, 
                    {"userIDs.id": {$eq: xs(myid).toString()}}
                ]
            }).then( async (convo) => {
                if(convo.length > 0){
                    await conversations.updateOne({
                        $and: [
                            {"userIDs.id": {$eq: xs(chat ? chat : kachatid)}}, 
                            {"userIDs.id": {$eq: xs(myid).toString()}}
                        ]
                    }, {$push: {messages: new_msg}}).then( async () => {
                        const {socket_id} = await user_data(chat ? chat : kachatid)
                        socket.to(socket_id).emit('new-message', new_msg)
                        return res({
                            status: true, 
                            message: new_msg
                        })
                    }).catch( (e) => {
                        throw new Error(e)
                    })
                } else {
                    throw new Error('Convo not found')
                }
            }).catch( (e) => {
                throw new Error(e)
            })
        } catch (e) {
            console.log(e)
            return res({
                status: false
            })
        }
    }), 
    //typing status 
    socket.on('typing', async (data) => {
        const {socket_id} = await user_data(chat ? chat : data.kachatid) 
        socket.to(socket_id).emit('typing')
    })
    socket.on('not-typing', async (data) => {
        const {socket_id} = await user_data(chat ? chat : data.kachatid)
        socket.to(socket_id).emit('not-typing')
    })
})
//detect if flog file is change
chokidar.watch('./log/').on('all', async (event, path) => {
    await fs.readFile('./log/logs.log', 'utf8', (err, data) => {
        admin_socket.emit('logs', {logs: data})
    })
})

start()
//check election every 10 seconds
setInterval(async () => {
    await users_election_handler()
    const election_status = await election_handler()
    if (election_status !== undefined) {
        //if there is new election started
        if (election_status.status && election_status.type === "Started") {
            //send event to admin & user that there is new election has been started 
            admin_socket.emit('new-election-started', { electionID: election_status.electionID })
            //get all voter in this election and notify 
            await election.find({_id: {$eq: xs(election_status.electionID)}}, {voters: 1, election_title: 1}).then( async (elec) => {
                if(elec.length > 0){
                   const voters = elec[0].voters 
                   if(voters.length > 0){
                       for(let i = 0; i < voters.length; i++){
                           await users.find({student_id: {$eq: xs(voters[i].student_id)}}, {socket_id: 1, _id: 1}).then( async (s) => {
                                await newNotification(s[0]._id, 'election', {
                                    id: uuidv4(), 
                                    type: 'info',
                                    content: `${elec[0].election_title} has been started`, 
                                    created: moment().tz("Asia/Manila").format()
                                })
                               if(s[0].socket_id !== "Offline"){
                                    users_socket.to(s[0].socket_id).emit('new_notification')
                                    users_socket.to(s[0].socket_id).emit('new-election-started', { electionID: election_status.electionID })
                               }
                           })
                       }
                   }
                }
            })
        }
        //if there is new election ended
        if (election_status.status && election_status.type === "Ended") {
            //send event to admin & user that there is new election has been started 
            admin_socket.emit('new-election-ended', { electionID: election_status.electionID })
            //get all voter in this election and notify 
            await election.find({_id: {$eq: xs(election_status.electionID)}}, {voters: 1, election_title: 1}).then( async (elec) => {
                if(elec.length > 0){
                   const voters = elec[0].voters 
                   if(voters.length > 0){
                       for(let i = 0; i < voters.length; i++){
                           await users.find({student_id: {$eq: xs(voters[i].student_id)}}, {socket_id: 1, _id: 1}).then( async (s) => {
                                await newNotification(s[0]._id, 'election', {
                                    id: uuidv4(), 
                                    type: 'info',
                                    content: `${elec[0].election_title} has been ended`, 
                                    created: moment().tz("Asia/Manila").format()
                                })
                               if(s[0].socket_id !== "Offline"){
                                users_socket.to(s[0].socket_id).emit('new_notification')
                                users_socket.to(s[0].socket_id).emit('new-election-ended', { electionID: election_status.electionID })
                               }
                           })
                       }
                   }
                }
            })
        }

    }
}, 2000)
async function start() {
    await election_handler()
    await users_election_handler()
    await fs.remove(`${process.cwd()}/uploads/`)
    await fs.remove(`${process.cwd()}/log/`)
    http.listen(port, () => {
        console.log(`Server Started on port ${port}`)
    })
}
