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
const multer = require('multer')
const uploader = multer()
const helmet = require('helmet')
const cors = require('cors')
const xs = require('xss')
const csrf = require('csurf')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const rfs = require('rotating-file-stream')
const sharedsession = require('express-socket.io-session')
const adminSocket = require('./routes/adminSocket')
const userSocket = require('./routes/userSocket')
const route = require('./routes/index')
const admin = require('./routes/admin')
const {ftp: ftp} = require('./routes/functions') 

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
    resave: false,
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
app.use(morgan(':status :remote-addr :method :url :response-time ms', { stream: log_stream }))
app.use(express.static(dir))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json()) // json 
app.use(uploader.array())
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
app.use(function(req, res, next) { 
    res.status(404).render('error/404')
})

//socket io session
//socket.io admin namespace 
const admin_socket = io.of("/admin").on("connection", (socket) => {adminSocket(io, socket)})
admin_socket.use(sharedsession(appsession, {
    autoSave: true,
    resave: false
}))
//socket.io users namespace 
const users_socket = io.of("/users").on("connection", (socket) => {userSocket(io, socket)})
users_socket.use(sharedsession(appsession, {
    autoSave: true,
    resave: false
}))
start()
async function start() {
    http.listen(port, console.log('Server Started on port ' + port))
    // if (process.env.NODE_ENV !== 'production') {
    //     http.listen(port, console.log('Server Started on port ' + port))
    // }
    // else{
    //     console.log("Connecting to FTP Server \n")
    //     if (await ftp()) {
    //         http.listen(port, console.log('Server Started on port ' + port))
    //         console.log("Connected to FTP Server \n")
    //     } else {
    //         //retry to connect 
    //         console.log("Can't connect to FTP Server \n")
    //         console.log("Reconnecting \n")
    //         http.listen(port, console.log('Server Started on port ' + port))
    //     }
    // }
}
