var socket = io('/users') 
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
socket.on('user-connected', (data) => {
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
})
socket.on('voter-accepted', (data) => {
    toast.fire({
        icon: 'success', 
        title: 'Voter request accepted',
        timer: 4000
    }).then( async () => {
        try {
            const req = await fetchtimeout('/election/status/main/', {
                method: 'POST', 
                headers: {
                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                }
            })
            if(req.ok){
                const res = await req.text() 
                $(".election__").html('')
                $(".election__").html(res)
            } else {
                throw new Error(`${req.status} ${req.statusText}`)
            }
        } catch (e) {
            Snackbar.show({ 
                text: `
                    <div class="flex justify-center items-center gap-2"> 
                        <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                        <span>Failed to get election status</span>
                    </div>
                `, 
                duration: 3000,
                showAction: false
            })
        }
        try {
            const req = await fetchtimeout('/election/status/side-menu/', {
                method: 'POST', 
                headers: {
                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                }
            })
            if(req.ok){
                const res = await req.text() 
                $(".e_menu").html(res)
            } else {
                throw new Error(`${req.status} ${req.statusText}`)
            }
        } catch (e) {
            Snackbar.show({ 
                text: `
                    <div class="flex justify-center items-center gap-2"> 
                        <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                        <span>Failed to get election status</span>
                    </div>
                `, 
                duration: 3000,
                showAction: false
            })
        }
    })
})