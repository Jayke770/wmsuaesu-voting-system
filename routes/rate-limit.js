const rateLimit = require('express-rate-limit')
module.exports = {
    search_limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 20,
    }),
    limit: rateLimit({
        windowMs: 1*60*1000, 
        max: 20,
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