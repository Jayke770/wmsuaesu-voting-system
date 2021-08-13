const rateLimit = require('express-rate-limit')
module.exports = {
    search_limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 10,
    }),
    limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 5,
    }),
    normal_limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 12,
    }),
    delete_limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 10,
    })
}