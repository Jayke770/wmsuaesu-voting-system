const socket = io('/admin') 
let course_req = false
async function course(id){
    if(!course_req){
        course_req = true
        await socket.emit("course", id, (res) => {
            return res
        })
    }
}
function year(element){
    for(let i = 0; i < element.length; i++){
        socket.emit("year", $(element[i]).attr("year"), (res) => {
            if(res.status){
                $(element[i]).text(res.type)
            } else {
                console.log('errr')
            }
        })
    }
}
function activeVoters(element){
    for(let i = 0; i < element.length; i++){
        socket.emit("active-voters", $(element[i]).attr("data"), (res) => {
            $(element[i]).text(res.total)
        })
    }
}