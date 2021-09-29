var socket = io('/admin') 
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
// election data
function electionData(id){
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
        }
    })
}
socket.on('test', (data) => {
    console.log(data)
})