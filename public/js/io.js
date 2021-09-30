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
socket.on('voter-accepted', async (data) => {
    alertify.notify('Voter request accepted')
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
socket.on('candidacy-accepted', async (data) => {
    alertify.notify("Candidacy has been accepted")
    try {
        const req = await fetchtimeout('/election/candidacy-status/', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
            }
        })
        if(req.ok) {
            const res = await req.text() 
            if(res !== 'false'){
                $(".fl_candidacy_form").find(".fl_candidacy, .ca_status").remove()
                $(".fl_candidacy_form").append(res)
                return true
            } else {
                return false
            }
        } else {
            throw new Error(`${req.status} ${req.statusText}`)
        }
    } catch (e) {
        Snackbar.show({ 
            text: `
                <div class="flex justify-center items-center gap-2"> 
                    <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                    <span>${e.message}</span>
                </div>
            `, 
            duration: 3000,
            showAction: false
        })
    }
})