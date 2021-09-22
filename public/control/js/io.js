const socket = io('/admin') 
let runtime_disconnected = false
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
//election details 
//new election partylists added
async function new_partylist(data){
    socket.emit('new-election-partylist', data, async (res) => {
        console.log('Response', await res)
    })
}
socket.on('new-election-partylist', (data) => {
    const currentElection = $("html").attr("data")
    const election = data.id === currentElection ? true : false 
    if(election){
        new_(0.3)
        Snackbar.show({ 
            text: `
                <div class="flex justify-center items-center gap-2"> 
                    <i style="font-size: 1.25rem; color: rgba(34, 197, 94, 1);" class="fad fa-info-circle"></i>
                    <span>New Election Partylist has been added</span>
                </div>
            `, 
            duration: 3000,
            showAction: false
        })
    } else {
        new_(0.3)
        Snackbar.show({ 
            text: `
                <div class="flex justify-center items-center gap-2"> 
                    <i style="font-size: 1.25rem; color: rgba(34, 197, 94, 1);" class="fad fa-info-circle"></i>
                    <span>New Election Partylist has been added</span>
                </div>
            `, 
            actionText: 'View',
            duration: 5000,
            onActionClick: () => {
                window.location.href = `/control/elections/id/${data.id}/home`
            }
        })
    }
})