var socket = io('/admin') 
let runtime_disconnected = false
const currentElection = $("html").attr("data")
//socket disconnect 
socket.on('disconnect', () => {
    runtime_disconnected = true
    new_(0.2)
    Snackbar.show({
        text: `
            <div class="flex justify-center items-center gap-2"> 
                <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                <span>Disconnected from server</span>
         </div>
        `, 
        duration: 3000,
        showAction: false
    })
})
//socket connected
socket.on('connect', () => {
    if(runtime_disconnected){
        new_(0.2)
        Snackbar.show({ 
            text: `
                <div class="flex justify-center items-center gap-2"> 
                    <i style="font-size: 1.25rem; color: rgba(34, 197, 94, 1);" class="fad fa-info-circle"></i>
                    <span>Connected to server</span>
                </div>
            `, 
            duration: 3000,
            showAction: false
        })
    }
})