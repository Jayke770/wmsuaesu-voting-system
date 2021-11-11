const rateLimit = require('express-rate-limit')
module.exports = {
    search_limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 50,
    }),
    limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 50,
    }),
    normal_limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 100,
    }),
    delete_limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 50,
    })
}