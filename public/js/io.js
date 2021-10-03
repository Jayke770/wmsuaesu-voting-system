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
socket.on('connect', (data) => {
    if(runtime_disconnected && socket.connected){
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
socket.on('voter-accepted', async (data) => {
    alertify.notify('Voter request accepted')
    if($("html").attr("joined") === "true"){
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
    } else {
        socket.emit('election-status', {electionID: data.electionID}, (res) => {
            console.log(res)
            if (res.status) {
                //election status
                if (res.data.election.status === 'Not Started') {
                    $(`div[data='election-${res.data.id}'`).find("#election_status").html(`
                        <span class="dark:bg-amber-700/40 bg-amber-600 dark:text-amber-500 text-gray-50 px-4 py-0.5 text-sm rounded-lg">${res.data.election.status}</span>
                    `)
                }
                else if (res.data.election.status === 'Started') {
                    $(`div[data='election-${res.data.id}'`).find("#election_status").html(`
                        <span class="dark:bg-teal-700/40 bg-teal-600 dark:text-teal-500 text-gray-50 px-4 py-0.5 text-sm rounded-lg">${res.data.election.status}</span>
                    `)
                }
                else if (res.data.election.status === 'Pending for deletion') {
                    $(`div[data='election-${res.data.id}'`).find("#election_status").html(`
                        <span class="dark:bg-rose-700/40 bg-rose-600 dark:text-rose-500 text-gray-50 px-4 py-0.5 text-sm rounded-lg animate-pulse">${res.data.election.status}</span>
                    `)
                }
                else if (res.data.election.status === 'Ended') {
                    $(`div[data='election-${res.data.id}'`).find("#election_status").html(`
                        <span class="dark:bg-red-700/40 bg-red-600 dark:text-red-500 text-gray-50 px-4 py-0.5 text-sm rounded-lg">${res.data.election.status}</span>
                    `)
                }
                //election voters count
                $(`election-${res.data.election.id}`).find("#election_voters_count").html(`${res.data.voters.total}`)
                //voter election request status 
                if(res.data.voters.status === 'Pending') {
                    $(`div[data='election-${res.data.id}'`).find("#voter_election_request").html(`  
                        <span class="dark:bg-amber-700/40 bg-amber-600 dark:text-amber-500 text-gray-50 px-4 py-0.5 text-sm rounded-lg animate-pulse">${res.data.voters.status}</span>
                    `)
                } else if(res.data.voters.status === 'Accepted') {
                    $(`div[data='election-${res.data.id}'`).find("#voter_election_request").html(`  
                        <span class="dark:bg-teal-700/40 bg-teal-600 dark:text-teal-500 text-gray-50 px-4 py-0.5 text-sm rounded-lg">${res.data.voters.status}</span>
                    `)
                } else if(res.data.voters.status === 'Deleted'){
                    $(`div[data='election-${res.data.id}'`).find("#voter_election_request").html(`  
                        <span class="dark:bg-rose-700/40 bg-rose-600 dark:text-rose-500 text-gray-50 px-4 py-0.5 text-sm rounded-lg">${res.data.voters.status}</span>
                    `)
                }
            }
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