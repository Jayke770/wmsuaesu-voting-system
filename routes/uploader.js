
const multer = require('multer') 
const path = require('path')
const {v4: uuidv4} = require('uuid')
const fs = require('fs-extra')
const storage = multer.diskStorage({
    destination: async function (req, file, cb) { 
      await fs.ensureDir('./uploads/')
      cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
      cb(null, uuidv4() + path.extname(file.originalname))
    }
})
const uploader = multer({ storage: storage, }).fields([
    {name: "coverPhoto", maxCount: 1}, 
    {name: 'profilePhoto', maxCount: 1}
])
module.exports = uploader