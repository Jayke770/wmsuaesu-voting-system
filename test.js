const sys = require('systeminformation')

g()
async function g() {  
   console.log(await sys.diskLayout())
}
