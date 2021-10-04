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
// election data
let election_deleted = false
function electionData(id){
    if(!election_deleted){
        socket.emit('election-data', {id: id}, async (res) => {
            if(await res.status){
                //update partylist count
                $("body").find("#partylist_count").html(res.data.partylists)
                //update positions count 
                $("body").find("#positions_count").html(res.data.positions)
                //update candidates accpted count 
                $("body").find("#accepted_candidates_count").html(res.data.candidates.accepted)
                //update candidates counts 
                if(res.data.candidates.pending !== 0){
                    $("#candidates_nav_count").append(`
                        <div class="e_pend_count_ca absolute right-[-2px] top-[-2px] dark:bg-purple-700 bg-purple-500 text-gray-50 dark:text-gray-300 w-5 h-5 text-center rounded-full text-sm">${res.data.candidates.pending}</div>
                    `)
                    $(".candidates_tab[data='pend']").find(".e_pend_count_ca").remove() 
                    $(".candidates_tab[data='pend']").append(`
                        <div class="e_pend_count_ca absolute right-[-2px] top-[-2px] dark:bg-purple-700 bg-purple-500 text-gray-50 dark:text-gray-300 w-5 h-5 text-center rounded-full text-sm">${res.data.candidates.pending}</div>
                    `)
                }
                if(res.data.candidates.pending === 0){
                    $("#candidates_nav_count").find(".e_pend_count_ca").remove() 
                    $(".candidates_tab[data='pend']").find(".e_pend_count_ca").remove() 
                }
                //update voters count
                if(res.data.voters.pending === 0){
                    $("a.election_btn[data='voters'], .e_pend").find(".e_pend_count").remove() 
                } else {
                    $("a.election_btn[data='voters'], .e_pend").find(".e_pend_count").remove()  
                    $("a.election_btn[data='voters'], .e_pend").append(`
                        <div class="e_pend_count absolute right-[-2px] top-[-2px] dark:bg-purple-700 bg-purple-500 text-gray-50 dark:text-gray-300 w-5 h-5 text-center rounded-full text-sm">${res.data.voters.pending}</div>
                    `)
                }
                //update voters count 
                $("body").find("#accepted_voter_count").html(res.data.voters.accepted)
                //update voters voted count 
                $("body").find("#voter_voter_count").html(res.data.voters.voted)
                e_data = false
            } else {
                election_deleted = true
                Swal.fire({
                    icon: 'info', 
                    title: 'This election was deleted', 
                    html: 'System detected that this election is already Pending for deletion', 
                    backdrop: true,
                    allowOutsideClick: false, 
                    confirmButtonText: 'Go Home'
                }).then( () => {
                    window.location.assign('/control')
                })
            }
        })
    }
}
// new voter joined the election 
socket.on('new-user-join-election', (data) => {
    const election = data.election 
    if(election === currentElection){
        alertify.notify('New voter joined the election!')
    }
})
//new voter file for candidacy 
socket.on('new-voter-file-for-candidacy', (data) => {
    const election = data.election 
    if(election === currentElection){
        alertify.notify('New voter filed for candidacy!')
    }
})
//new election started 
socket.on('new-election-started', async (data) => {
    await election.election_status()
    await election.status()
    await election.dt()
})
socket.on('new-election-ended', async (data) => {
    await election.election_status()
    await election.status()
    await election.dt()
})
const election = {
    election_status: async () => {
        try {
            const req = await fetchtimeout(`/control/election/status/`, {
                headers: {
                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                }, 
                method: 'POST'
            })
            if(req.ok){
                const res = await req.text() 
                $(".election_status").html(res)
            } else {
                throw new Error(`${req.status} ${req.statusText}`)
            }
        } catch (e) {
            console.log(e.message)
        }
    },
    status: async () => {
        try {
            const req2 = await fetchtimeout(`/control/elections/settings/election-settings/`, {
                headers: {
                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                }, 
                method: 'POST'
            })
            if(req2.ok){
                const res = await req2.json() 
                console.log(res)
            } else {
                throw new Error(`${req2.status} ${req2.statusText}`)
            }
        } catch (e) {
            console.log(e.message)
        }
    }, 
    dt: async () => {
        try {
            const req3 = await fetchtimeout('/control/elections/status/election-date-time/', {
                headers: {
                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                }, 
                method: 'POST'
            })
            if(req3.ok){
                const res = await req3.text() 
                $(".election-date-time").html(res)
            } else {
                throw new Error(`${req3.status} ${req3.statusText}`)
            }
        } catch (e) {
            console.log(e.message)
        }
    }, 
}