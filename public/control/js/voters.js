$(document).ready( () => {
    //open add voter 
    $(".add_voter_open").click( () => {
        const parent = $(".user_add")
        const child = $(".user_add_main")
        child.addClass(child.attr("animate-in"))
        parent.addClass("flex")
        parent.removeClass("hidden") 
        setTimeout( async () => {
            child.removeClass(child.attr("animate-in"))
            await voter.search('')
        }, 500)
    })
    //close add voter 
    $(".user_add").click( function (e) {
        if($(e.target).hasClass("user_add")){
            e.preventDefault()
            const parent = $(".user_add")
            const child = $(".user_add_main")
            child.addClass(child.attr("animate-out"))
            setTimeout( async () => {
                child.removeClass(child.attr("animate-out"))
                parent.addClass("hidden")
                parent.removeClass("flex") 
                $(".users_list").find(".users_skeleton").show()
                $(".users_list").find(".users_").remove()
            }, 500)
        }
    })
    $(".cls_user_add").click( () =>{
        const parent = $(".user_add")
        const child = $(".user_add_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( async () => {
            child.removeClass(child.attr("animate-out"))
            parent.addClass("hidden")
            parent.removeClass("flex") 
            $(".users_list").find(".users_skeleton").show()
            $(".users_list").find(".users_").remove()
        }, 500)
    })

    //click add user as voter 
    let add_user_v = false
    $(".users_list").delegate(".add_user_as_voter", "click", async function (e) { 
        e.preventDefault() 
        const def = $(this).html()
        if(!add_user_v){
            Swal.fire({
                icon: 'question', 
                title: 'Add User As Voter', 
                backdrop: true, 
                allowOutsideClick: false,
                showDenyButton: true, 
                confirmButtonText: "Yes"
            }).then( (a) => {
                if(a.isConfirmed) {
                    Swal.fire({
                        icon: 'info', 
                        title: 'Adding User As Voter', 
                        html: 'Please Wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading() 
                            try {
                                $(this).html(voter.loader())
                                add_user_v = true 
                                let data = new FormData() 
                                data.append("id", $(this).attr("data"))
                                const req = await fetchtimeout('/control/elections/voters/add-user-add-voter/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    add_user_v = false 
                                    $(this).html(def)
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false
                                    }).then( async () => {
                                        if(res.status) { 
                                            socket.emit('send-notification', {student_id: res.student_id})
                                            $(`.users_[data='${$(this).attr("data")}']`).remove()
                                            await voter.voters()
                                        }
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                add_user_v = false 
                                $(this).html(def)
                                Swal.fire({
                                    icon: 'error', 
                                    title: 'Connection error', 
                                    html: e.message, 
                                    backdrop: true, 
                                    allowOutsideClick: false
                                })
                            }
                        }
                    })
                }
            })
        }
    })

    //search user 
    let search_usr = false 
    $(".search_user_for_ca").keyup( async function () {
        if(!search_usr){
            await voter.search($(this).val())
        }
    })

    //sort voters 
    let sort_usr = false 
    $(".sort_voters").change( async function () {
        if(!sort_usr){
            try {
                sort_usr = true 
                $(".election_voters_list").find(".election_voter_skeleton").show() 
                $(".election_voters_list").find(".election_voter").remove() 
                const data = new FormData() 
                data.append("sort", $(this).val())
                const req = await fetchtimeout('/control/elections/voters/sort-voters/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text() 
                    sort_usr = false 
                    $(".election_voters_list").find(".election_voter_skeleton").hide() 
                    $(".election_voters_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                sort_usr = false 
                voter.error(e.message)
            }
        }
    })

    //search voters 
    let search_voter = false 
    $(".search_voters").keyup( function () {
        if(!search_voter){
            setTimeout( async () => {
                try {
                    search_voter = false
                    $(".election_voters_list").find(".election_voter_skeleton").show() 
                    $(".election_voters_list").find(".election_voter").remove() 
                    let data = new FormData() 
                    data.append("search", $(this).val())
                    const req = await fetchtimeout('/control/elections/voters/search-voters/', {
                        method: 'POST', 
                        headers: {
                            'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                        }, 
                        body: data
                    })
                    if(req.ok){
                        const res = await req.text() 
                        $(".election_voters_list").find(".election_voter_skeleton").hide() 
                        $(".election_voters_list").append(res)
                    } else {
                        throw new Error(`${req.status} ${req.statusText}`)
                    }
                } catch (e) {
                    search_voter = false
                    voter.error(e.message)
                }
            }, 1000)
        }
    })

    // accept voter 
    let accept_voter = false 
    $(".election_voters_list").delegate(".accept_voter_req", "click", async function () {
        if(!accept_voter){
            Swal.fire({
                icon: 'question', 
                title: 'Accept Voter Request', 
                html: 'This will accept the current voter request', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                confirmButtonText: "Accept", 
                denyButtonText: "Cancel"
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Accepting Voter Request', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading() 
                            try {
                                accept_voter = true
                                let data = new FormData() 
                                data.append("id", $(this).attr("data")) 
                                const req = await fetchtimeout('/control/elections/voters/accept-voter/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    accept_voter = false
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false
                                    }).then( async () => {
                                        if(res.status){
                                            socket.emit('send-notification', {student_id: res.student_id})
                                            socket.emit('voter-accepted', {voterID: $(this).attr("data")})
                                            await voter.voters()
                                        }
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                accept_voter = false
                                Swal.fire({
                                    icon: 'error', 
                                    title: 'Connection error', 
                                    html: e.message, 
                                    backdrop: true, 
                                    allowOutsideClick: false
                                })
                            }
                        }
                    })
                }
            })
        }
    })

    // remove voter 
    let remove_voter = false 
    $(".election_voters_list").delegate(".remove_voter_req", "click", async function () {
        if(!remove_voter){
            Swal.fire({
                icon: 'question', 
                title: 'Remove Voter', 
                html: 'This will remove the current voter', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                confirmButtonText: "Remove", 
                denyButtonText: "Cancel"
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Removing Voter', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading() 
                            try {
                                remove_voter = true
                                let data = new FormData() 
                                data.append("id", $(this).attr("data")) 
                                const req = await fetchtimeout('/control/elections/voters/remove-voter/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    remove_voter = false
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false
                                    }).then( async () => {
                                        if(res.status){
                                            socket.emit('send-notification', {student_id: res.student_id})
                                            socket.emit('voter-remove', {voterID: $(this).attr("data")})
                                        }
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                remove_voter = false
                                Swal.fire({
                                    icon: 'error', 
                                    title: 'Connection error', 
                                    html: e.message, 
                                    backdrop: true, 
                                    allowOutsideClick: false
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    //websocket
    //get election voters 
    setInterval( () => {
        socket.emit('election-data', {id: $("html").attr("election-id")}, async (res) => {
            if(res.status && parseInt($("html").attr("data-voters")) !== res.data.voters.total){
                $("html").attr("data-voters", res.data.voters.total)
                await voter.voters()
            }
        })
    }, 2000)
    // new voter joined the election 
    socket.on('new-user-join-election', (data) => { 
        if($("html").attr("election-id") === data.election){
            alertify.notify('New voter joined the election!')
        }
    })
    //check election voters 
    setTimeout( async () => {
        await voter.voters()
    }, 1000)
    const voter = {
        voters: async () => {
            try {
                $(".election_voters_list").find(".election_voter_skeleton").show() 
                $(".election_voters_list").find(".election_voter").remove() 
                const req = await fetchtimeout('/control/elections/voters/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok) {
                    const res = await req.text() 
                    $(".election_voters_list").find(".election_voter_skeleton").hide() 
                    $(".election_voters_list").append(res)
                } else{ 
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                voter.error(e.message)
            }
        },
        search: async (search) => {
            try {
                search_usr = true
                let data = new FormData()
                data.append("search", search)
                $(".users_list").find(".users_skeleton").show()
                $(".users_list").find(".users_").remove()
                const req = await fetchtimeout('/control/elections/voters/search-users/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    },
                    body: data
                })
                if(req.ok) {
                    const res = await req.text()
                    search_usr = false
                    $(".users_list").find(".users_skeleton").hide()
                    $(".users_list").find(".users_").remove()
                    $(".users_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                search_usr = false
                toast.fire({
                    icon: 'error',
                    title: e.message,
                    timer: 2500
                })
            }
        },
        loader: () => {
            return '<i class="fad animate-spin fa-spinner-third"></i>'
        }, 
        error: (msg) => {
            Snackbar.show({
                text: `
                    <div class="flex justify-center items-center gap-2"> 
                        <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                        <span>${msg}</span>
                 </div>
                `, 
                duration: 3000,
                showAction: false
            })
        }
    }
})