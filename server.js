if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const express = require('express')
const app = express()
const route = require('./routes/index')
const auth = require('./routes/auth')
const admin = require('./routes/admin')
const { new_nty: nty, ftp: ftp} = require('./routes/functions')
const port = process.env.PORT || 8989
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const bodyparser = require('body-parser')
const path = require('path')
const session = require('express-session')
const mongoose = require('mongoose')
const mongodbstore = require('connect-mongodb-session')(session)
const bcrypt = require('bcrypt')
const morgan = require('morgan')
const multer = require('multer')
const user = require('./models/user')
const admin_acc = require('./models/admin')
const election = require('./models/election')
const uploader = multer()
const helmet = require('helmet')
const cors = require('cors')
const icon = require('express-favicon')
const xs = require('xss')
const { v4: uuidv4 } = require('uuid')
const objectid = require('mongodb').ObjectID
const rfs = require('rotating-file-stream')
const fs = require('fs')
const nl2br = require('nl2br')

start()
mongoose.connect(process.env.db_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const store = new mongodbstore({
    uri: process.env.db_url,
    collection: 'voting-sessions'
})

store.on('error', (err) => {
    console.log(err)
})
const dir = path.join(__dirname, './public')
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
)
const log_stream = rfs.createStream('logs.log', {
    interval: '1d',
    path: path.join(__dirname, 'log')
})
app.use(morgan(':status :remote-addr :method :url :response-time ms', { stream: log_stream }))
app.use(icon(__dirname + '/public/assets/logo.png'))
app.use(express.static(dir))
app.use(express.urlencoded({ extended: true }))
app.use(express.json()) // json 
app.use(uploader.array())
app.use(cors())
const shared_session = (session({
    name: "wmsu-session-id",
    secret: process.env.session_secret,
    expires: 1000 * 60 * 60 * 24,
    cookie: {
       maxAge: 1000 * 60 * 60 * 24 * 1 
    },
    store: store,
    resave: false,
    saveUninitialized: true,
    connectionOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
    }
}))

app.use(shared_session)
app.set('view engine', 'ejs')
app.use(route) //all user req
app.use(admin) //all admin req 
    //http 404 req
app.use(function(req, res, next) {
    res.status(404).render('Error/index')
})

//socker.io
io.use((socket, next) => {
    shared_session(socket.request, {}, next)
})

io.on("connection", async(socket) => {
    var user_session = socket.request.session
    const user_id = user_session.myid
    socket.emit('server-restarted')
        //save socket_id to db
    const qry = { _id: user_id }
    const new_user_socket_id = { $set: { socket_id: socket.id } }
    if (user_session.user_type == "admin") {
        await admin_acc.updateOne(qry, new_user_socket_id, (err, socket_res) => {
            console.log('User Type : ' + user_session.user_type)
            console.log('Admin ID : ' + user_session.myid)
            console.log('Admin Connected ' + socket.id)
        })
    } else {
        await user.updateOne(qry, new_user_socket_id, (err, socket_res) => {
            console.log('User Type : ' + user_session.user_type)
            console.log('User ID : ' + user_session.myid)
            console.log('User Connected ' + socket.id)
                //get the admin socket id and notify that new user is logggedin
            admin_acc.find({}, (err, admin_doc) => {
                socket.emit('connected', { msg: "Connected to server" })
                socket.to(admin_doc[0].socket_id).emit("new-user-logged", { id: user_session.myid, socket: socket.id })
            })
        })
    }
    socket.on("disconnect", async() => {
            //save socket_id to db when user disconnect
            const qry = { _id: user_id }
            const new_user_socket_id = { $set: { socket_id: 'Offline' } }
            if (user_session.user_type == "admin") {
                await admin_acc.updateOne(qry, new_user_socket_id, (err, socket_res) => {
                    console.log('Admin ID : ' + user_session.user_type)
                    console.log('Admin Disconected ' + socket.id)
                })
            } else {
                await user.updateOne(qry, new_user_socket_id, (err, socket_res) => {
                    console.log('User ID : ' + user_session.user_type)
                    console.log('User Disconected ' + socket.id)
                        //get the admin socket id and notify that new user is logggedin
                    admin_acc.find({}, (err, admin_doc) => {
                        socket.to(admin_doc[0].socket_id).emit("new-user-logged-out", { id: user_session.myid, socket: socket.id })
                    })
                })
            }
        })
        //when user try connect the socket server
    socket.on('response-to-user', (id) => {
            socket.to(id).emit('connected', { msg: "Connected to server" })
        })
        //election status 
    socket.on('leave-election', async(status) => {
            const e_id = user_session.election_id
            const userid = user_session.myid
            var fl_name

            //get fullname of user who left 
            await user.find({ _id: userid }, { firstname: 1, middlename: 1, lastname: 1 }, (err, flnm) => {
                    if (!err) {
                        fl_name = flnm[0].firstname + ' ' + flnm[0].middlename + ' ' + flnm[0].lastname
                    }
                })
                //get all voters id
            await election.find({ _id: e_id }, { voters: 1 }, (err, v) => {
                if (!err) {
                    if (v[0].voters.length != 0) {
                        for (var i = 0; i < v[0].voters.length; i++) {
                            //get voters socket id 
                            user.find({ _id: v[0].voters[i].id }, { socket_id: 1 }, (err, user_sock) => {
                                if (!err) {
                                    //if userid is not equal to userid who left
                                    if (user_sock[0]._id != userid) {
                                        //construct data for notification 
                                        const new_nty = {
                                                nty_id: uuidv4(),
                                                userid: userid,
                                                name: fl_name,
                                                election: false,
                                                data: 'Left the election',
                                                type: 'e-left',
                                                read: 0,
                                                time: Date.now()
                                            }
                                            //check if the user is not offline 
                                        if (user_sock[0].socket_id != "Offline") {
                                            //if not offline send notification to user and add to user table
                                            user.updateOne({ _id: user_sock[0]._id }, { $push: { notifications: new_nty } }, (err, nty) => {
                                                if (!err) {
                                                    //send notification to all user
                                                    socket.to(user_sock[0].socket_id).emit('user-left-election', new_nty)
                                                        //send responce 
                                                    status({
                                                        leave: true
                                                    })
                                                }
                                            })
                                        } else {
                                            //user is offline
                                            user.updateOne({ _id: user_sock[0]._id }, { $push: { notifications: new_nty } }, (err, nty) => {
                                                if (!err) {
                                                    status({
                                                        leave: true
                                                    })
                                                }
                                            })
                                        }


                                    }
                                }
                            })
                        }
                    } else {
                        //no user to notify because voters array is empty
                        status({
                            leave: true
                        })
                    }
                }
            })
        })
        //when a user commented to a profile
    socket.on('profile-comment', async(cmt, res) => {
            const visited_id = user_session.visited_id
            const userid = user_session.myid
                //get user socket id
            await user.find({ _id: visited_id }, { socket_id: 1 }, (err, found) => {
                //get the name of the user who comment
                if (!err) {
                    user.find({ _id: userid }, { firstname: 1, middlename: 1, lastname: 1 }, (err, is_found_name) => {
                        if (!err) {
                            //response to user
                            const data = {
                                    name: is_found_name[0].firstname + ' ' + is_found_name[0].middlename + ' ' + is_found_name[0].lastname,
                                    cmt: xs(cmt.cmt),
                                    time: Date.now()
                                }
                                //nty data
                            const nty = {
                                nty_id: uuidv4(),
                                userid: userid,
                                name: is_found_name[0].firstname + ' ' + is_found_name[0].middlename + ' ' + is_found_name[0].lastname,
                                data: cmt.cmt,
                                type: 'comment',
                                read: 0,
                                time: Date.now()
                            }
                            if (found[0].socket_id != "Offline") {
                                //dont insert nty data if the user visited their own profile
                                if (user_id.toString() != visited_id.toString()) {
                                    //update user nty
                                    user.updateOne({ _id: visited_id }, { $push: { notifications: nty } }, (err, is_nty) => {
                                        if (!err) {
                                            socket.to(found[0].socket_id).emit('new-profile-comment', nty)
                                            res({
                                                is_cmt: true,
                                                data: data
                                            })
                                        }
                                    })
                                } else {
                                    res({
                                        is_cmt: true,
                                        data: data
                                    })
                                }
                            } else {
                                //dont insert nty data if the user visited their own profile
                                if (user_id.toString() != visited_id.toString()) {
                                    user.updateOne({ _id: visited_id }, { $push: { notifications: nty } }, (err, is_nty) => {
                                        if (!err) {
                                            res({
                                                is_cmt: true,
                                                data: data
                                            })
                                        }
                                    })
                                } else {
                                    res({
                                        is_cmt: true,
                                        data: data
                                    })
                                }
                            }
                        }
                    })
                }
            })
        })
        //new user joined the election 
    socket.on('join-election', async(id) => {
            const userid = user_session.myid
            var fl_name
                //get fullname of the user who joined 
            await user.find({ _id: userid }, { firstname: 1, middlename: 1, lastname: 1 }, (err, res) => {
                    if (!err) {
                        fl_name = res[0].firstname + ' ' + res[0].middlename + ' ' + res[0].lastname
                    }
                })
                //get all voter id 
            await election.find({ _id: id }, { voters: 1 }, (err, votrs) => {
                for (var i = 0; i < votrs.length; i++) {
                    //get all voters inside the json array
                    for (var uid in votrs[i].voters) {
                        //get all voters id 
                        user.find({ _id: votrs[i].voters[uid].id }, { socket_id: 1, _id: 1 }, (err, v_id) => {
                            //construct data for notification 
                            const new_nty = {
                                nty_id: uuidv4(),
                                userid: userid,
                                name: fl_name,
                                election: false,
                                data: 'Joined the election',
                                type: 'plus-circle',
                                read: 0,
                                time: Date.now()
                            }
                            if (v_id[0]._id != userid) { // if userid is not equal to id in db
                                //check if the user id in db is not offline
                                if (v_id[0].socket_id != "Offline") {
                                    user.updateOne({ _id: v_id[0]._id }, { $push: { notifications: new_nty } }, (err, up_res) => {
                                        if (!err) {
                                            //send notification to user 
                                            socket.to(v_id[0].socket_id).emit('new-user-joined-election', new_nty)
                                        }
                                    })
                                } else {
                                    //if user is offline insert notification data 
                                    user.updateOne({ _id: v_id[0].socket_id }, { $push: { notifications: new_nty } })
                                }
                            }
                        })
                    }
                }
            })
        })
        //notify all voters in current election that their is new candidate 
    socket.on('file-candidacy', async() => {
            const election_id = user_session.election_id
            const user_id = user_session.myid
            var fl_name
                //get fullname of candidate 
            await user.find({ _id: user_id }, { firstname: 1, middlename: 1, lastname: 1 }, (err, res) => {
                    if (!err) {
                        fl_name = res[0].firstname + ' ' + res[0].middlename + ' ' + res[0].lastname
                    }
                })
                //get all voters id 
            await election.find({ _id: election_id }, { voters: 1 }, (err, voters) => {
                if (!err) {
                    if (voters.length != 0) {
                        //loop all voter
                        for (var i = 0; i < voters.length; i++) {
                            //get all user voters id 
                            for (var x in voters[i].voters) {
                                //get user socket id 
                                user.find({ _id: voters[i].voters[x].id }, { _id: 1, socket_id: 1, firstname: 1, middlename: 1, lastname: 1 }, (err, user_socket) => {
                                    if (!err) {
                                        for (var x = 0; x < user_socket.length; x++) {
                                            //notify other voters that their is new candidate except th candidate
                                            if (user_socket[x]._id.toString() != user_id) {
                                                const new_nty = {
                                                    nty_id: uuidv4(),
                                                    userid: user_id,
                                                    name: fl_name,
                                                    election: true,
                                                    data: 'New Candidate',
                                                    type: 'info',
                                                    read: 0,
                                                    time: Date.now()
                                                }
                                                if (user_socket[x].socket_id != "Offline") {
                                                    //if user is not offline
                                                    const s_id = user_socket[x].socket_id //voter socket id
                                                        //save to user data 
                                                    user.updateOne({ _id: user_socket[x]._id }, { $push: { notifications: new_nty } }, (err, up_nty) => {
                                                        if (!err) {
                                                            //send notification to each user
                                                            socket.to(s_id).emit('new_candidate', new_nty)
                                                        }
                                                    })
                                                } else {
                                                    //if user is offline
                                                    //save to user data 
                                                    user.updateOne({ _id: user_socket[x]._id }, { $push: { notifications: new_nty } }, (err, up_nty) => {
                                                        if (err) {
                                                            console.log(err)
                                                        }
                                                    })
                                                }
                                            }
                                        }
                                    }
                                })
                            }
                        }
                    }
                }
            })
        })
        //send message 
    socket.on('send-chat', async(msg, status) => {
            const ka_chat = msg.id
            const userid = user_session.myid
            var new_chat
            var new_nty
                //new_msg_chat 
            var msg_chat
                //get user data
            await user.find({ _id: userid }, { firstname: 1, middlename: 1, lastname: 1 }, (err, data) => {
                //construct data for chats
                new_chat = {
                        id: data[0]._id,
                        fname: data[0].firstname,
                        mname: data[0].middlename,
                        lname: data[0].lastname,
                        created: Date.now(),
                        chats: []
                    }
                    //for notifications
                new_nty = nty(data[0]._id, data[0].firstname, true, 'New message from', 'envelop')
                    //for chats
                msg_chat = {
                    msg_id: uuidv4(),
                    id: userid,
                    msg: msg.msg,
                    sent: Date.now(),
                    status: 'sent'
                }
                if (ka_chat == 'admin') {
                    admin_acc.updateOne({ "messages.id": objectid(userid) }, { $push: { "messages.$.chats": msg_chat } }, (err, sent_admin) => {
                        if (!err) {
                            status({
                                sent: true,
                                msg: msg_chat
                            })
                        }
                    })
                } else {
                    //check if the two user is chatting before 
                    user.find({ _id: ka_chat, "messages.id": data[0]._id }, { messages: 1, socket_id: 1 }, (err, ischat) => {
                        if (!err) {
                            //check if wal ba sla nagchat before if empty means wala
                            if (ischat.length == 0) {
                                // if the user did not chat before 
                                user.find({ _id: ka_chat }, { _id: 1, socket_id: 1 }, (err, ka_chat_data) => {
                                    if (!err) {
                                        //save sender data  to ka_chat doc
                                        user.updateOne({ _id: ka_chat }, { $push: { messages: new_chat } }, (err, is_up_new) => {
                                            if (!err) {
                                                //save message to kachat chats feild
                                                user.updateOne({ _id: ka_chat, "messages.id": userid }, { $push: { "messages.$.chats": msg_chat } }, (err, snt) => {
                                                    if (!err) {
                                                        user.updateOne({ _id: userid, "messages.id": ka_chat_data[0]._id }, { $push: { "messages.$.chats": msg_chat } }, (err, snt) => {
                                                            if (!err) {
                                                                if (ka_chat_data[0].socket_id != "Offline") {
                                                                    //if user is online notify them
                                                                    socket.to(ka_chat_data[0].socket_id).emit('new-message', msg_chat)
                                                                    status({
                                                                        sent: true,
                                                                        msg: msg_chat
                                                                    })
                                                                } else {
                                                                    //save to notifications
                                                                    user.updateOne({ _id: ka_chat }, { $push: { notifications: new_nty } }, (err, nty) => {
                                                                        if (!err) {
                                                                            status({
                                                                                sent: true,
                                                                                msg: msg_chat
                                                                            })
                                                                        }
                                                                    })
                                                                }
                                                            } else {
                                                                status({
                                                                    sent: false,
                                                                    line: 465
                                                                })
                                                            }
                                                        })
                                                    }

                                                })
                                            } else {
                                                status({
                                                    sent: false,
                                                    line: 474
                                                })
                                            }
                                        })
                                    } else {
                                        status({
                                            sent: false,
                                            line: 479
                                        })
                                    }
                                })
                            } else {
                                //nag chat na sila before 
                                //get the data of kachat 
                                user.find({ _id: ka_chat }, { _id: 1, socket_id: 1 }, (err, kachat) => {
                                    if (!err) {
                                        if (kachat.length != 0) {
                                            if (kachat[0].socket_id != "Offline") {
                                                //save message to chats feilds to each user 
                                                user.updateOne({ _id: kachat[0]._id, "messages.id": userid }, { $push: { "messages.$.chats": msg_chat } }, (err, snt) => {
                                                    if (!err) {
                                                        //save msg to sender chats feils 
                                                        user.updateOne({ _id: userid, "messages.id": kachat[0]._id }, { $push: { "messages.$.chats": msg_chat } }, (err, snt_) => {
                                                            if (!err) {
                                                                //notify the kachat / receiver 
                                                                socket.to(kachat[0].socket_id).emit('new-message', msg_chat)
                                                                status({
                                                                    sent: true,
                                                                    msg: msg_chat
                                                                })
                                                            }
                                                        })
                                                    }
                                                })
                                            } else {
                                                //kachat is offline 
                                                user.updateOne({ _id: kachat[0]._id, "messages.id": userid }, { $push: { "messages.$.chats": msg_chat } }, (err, snt) => {
                                                    if (!err) {
                                                        //save to sender chats feilds 
                                                        user.updateOne({ _id: userid, "messages.id": kachat[0]._id }, { $push: { "messages.$.chats": msg_chat } }, (err, snt) => {
                                                            if (!err) {
                                                                //save to kachat notifications feilds
                                                                user.updateOne({ _id: kachat[0]._id }, { $push: { notifications: new_nty } }, (err, nty) => {
                                                                    if (!err) {
                                                                        status({
                                                                            sent: true,
                                                                            msg: msg_chat
                                                                        })
                                                                    } else {
                                                                        status({
                                                                            sent: false,
                                                                            line: 526
                                                                        })
                                                                    }
                                                                })
                                                            } else {
                                                                status({
                                                                    sent: false,
                                                                    line: 526
                                                                })
                                                            }
                                                        })
                                                    } else {
                                                        status({
                                                            sent: false,
                                                            line: 521
                                                        })
                                                    }
                                                })
                                            }
                                        } else {
                                            status({
                                                sent: false,
                                                line: 516
                                            })
                                        }
                                    } else {
                                        status({
                                            sent: false,
                                            line: 517
                                        })
                                    }
                                })
                            }
                        }
                    })
                }
            })
        })
        //typing status 
    socket.on('typing', async(id) => {
        //get socket id 
        if (id == 'admin') {
            await admin_acc.find({}, { socket_id: 1 }, (err, data) => {
                if (!err) {
                    if (data[0].socket_id != "Offline") {
                        socket.to(data[0].socket_id).emit('kachat-is-typing')
                    }
                }
            })
        } else {
            await user.find({ _id: id }, { socket_id: 1 }, (err, data) => {
                if (!err) {
                    if (data[0].socket_id != "Offline") {
                        socket.to(data[0].socket_id).emit('kachat-is-typing')
                    }
                }
            })
        }
    })
    socket.on('not-typing', async(id) => {
            //get socket id 
            if (id == 'admin') {
                await admin_acc.find({}, { socket_id: 1 }, (err, data) => {
                    if (!err) {
                        if (data[0].socket_id != "Offline") {
                            socket.to(data[0].socket_id).emit('kachat-is-not-typing')
                        }
                    }
                })
            } else {
                await user.find({ _id: id }, { socket_id: 1 }, (err, data) => {
                    if (!err) {
                        if (data[0].socket_id != "Offline") {
                            socket.to(data[0].socket_id).emit('kachat-is-not-typing')
                        }
                    }
                })
            }
        })
        //logs
    socket.on('logs', async(res_log) => {
        if (user_session.user_type == 'admin') {
            try {
                var log = await fs.readFileSync('log/logs.log', 'utf-8')
                res_log({
                    log: nl2br(log)
                })
            } catch (e) {
                log({
                    log: e
                })
            }
        }
    })
})
async function start() {
    if (process.env.NODE_ENV !== 'production') {
        http.listen(port, console.log('Server Started on port ' + port))
    }
    else{
        console.log("Connecting to FTP Server \n")
        if (await ftp()) {
            http.listen(port, console.log('Server Started on port ' + port))
            console.log("Connected to FTP Server \n")
        } else {
            //retry to connect 
            console.log("Can't connect to FTP Server \n")
            console.log("Reconnecting \n")
            start()
        }
    }
}