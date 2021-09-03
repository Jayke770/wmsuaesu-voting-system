if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const express = require('express')
const app = express()
const route = require('./routes/index')
const admin = require('./routes/admin')
const {ftp: ftp} = require('./routes/functions')
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
const { v4: uuidv4 } = require('uuid')
const rfs = require('rotating-file-stream')
const sharedsession = require('express-socket.io-session')
const adminSocket = require('./routes/adminSocket')
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
const appsession = session({
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
})
app.use(morgan(':status :remote-addr :method :url :response-time ms', { stream: log_stream }))
app.use(express.static(dir))
app.use(express.urlencoded({ extended: true }))
app.use(express.json()) // json 
app.use(uploader.array())
app.use(cors())
app.set('view engine', 'ejs')
app.use(appsession)
app.use(route) //all user req
app.use(admin) //all admin req 
    //http 404 req
app.use(function(req, res, next) {
    res.status(404).render('Error/index')
})

//socket io session
io.use(sharedsession(appsession, {
    autoSave: true
}))
io.of('/admin').use(sharedsession(appsession, {
    autoSave: true
}))
io.of('/user').use(sharedsession(appsession, {
    autoSave: true
}))
start()
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
            http.listen(port, console.log('Server Started on port ' + port))
        }
    }
}

//socket.io admin namespace 
io.of("/admin").on("connection", adminSocket)