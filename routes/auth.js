module.exports = {
    authenticated: (req, res, next) => { //redirect user to specific router
        if (req.session.islogin && !req.session.take_photo) {
            if (req.session.user_type != "admin") {
                return res.redirect('/home')
            }
            if (req.session.user_type == "admin") {
                return res.redirect('/control')
            }
        }
        return next()
    },
    isadmin: (req, res, next) => {//detect if user is admin
        if (req.session.islogin) {
            if (req.session.user_type == "admin") {
                return next()
            }
        }
        return res.redirect('/logout')
    },
    isloggedin: (req, res, next) => { //detect if user is login 
        if (req.session.islogin && !req.session.take_photo) {
            if (req.session.user_type != "admin") {
                return next()
            }
        }
        if (req.session.islogin && req.session.take_photo) {
            return res.redirect('/register_face')
        }
        return res.redirect('/logout')
    },
    take_photo: (req, res, next) => {
        if (req.session.take_photo && req.session.islogin) {
            return next()
        }
        if (!req.session.take_photo && req.session.islogin) {
            return res.redirect('/')
        }
        req.session.destroy()
        res.redirect('/')
    },
    get_face: (req, res, next) => {
        if (req.session.take_photo) {
            return res.redirect('/register_face')
        }
        return next()
    }
}