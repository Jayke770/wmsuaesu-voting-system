$(document).ready( () => {
    //open add candidates
    $(".add_ca_open").click( () => {
        const parent = $(".add_ca")
        const child = $(".add_ca_main")
        child.addClass(child.attr("animate-in"))
        parent.addClass("flex")
        parent.removeClass("hidden")
        setTimeout( async () => {
            child.removeClass(child.attr("animate-in"))
            await ca.search('')
        }, 500)
    })
    //close add candidates
    $(".add_ca").click( function (e) {
        if($(e.target).hasClass("add_ca")){
            e.preventDefault()
            const parent = $(".add_ca")
            const child = $(".add_ca_main")
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                child.removeClass(child.attr("animate-out"))
                parent.addClass("hidden")
                parent.removeClass("flex")
                $(".users_for_ca_list").find(".user_for_ca").remove()
                $(".users_for_ca_list").find(".user_for_ca_skeleton").show()
            }, 500)
        }
    })
    $(".close_add_ca").click( () => {
        const parent = $(".add_ca")
        const child = $(".add_ca_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            child.removeClass(child.attr("animate-out"))
            parent.addClass("hidden")
            parent.removeClass("flex")
            $(".users_for_ca_list").find(".user_for_ca").remove()
            $(".users_for_ca_list").find(".user_for_ca_skeleton").show()
        }, 500)
    })
    //search users
    let search_usr = false
    $(".search_user_for_ca").keyup( async function () {
        if(!search_usr && $(this).val().length > 1){
            await ca.search($(this).val())
        }
    })
    $(".search_user_for_ca").keydown( async function () {
        if(!search_usr){
            await ca.search('')
        }
    })

    //add voter as candidate
    let add_voter_as_ca = false
    $(".users_for_ca_list").delegate(".user_for_ca", "click", async function (e) {
        const parent = $(".confirm_add_ca")
        const child = $(".confirm_add_ca_main")
        if(!add_voter_as_ca){
            $("body").find(".selected_voter").val($(this).attr("data"))
            child.addClass(child.attr("animate-in"))
            parent.addClass("flex")
            parent.removeClass("hidden")
            setTimeout( () => {
                child.removeClass(child.attr("animate-in"))
            }, 500)
        }
    })
    let add_form_ca = false
    $(".confirm_add_ca_form").submit( function (e) {
        e.preventDefault()
        if(!add_form_ca){
            Swal.fire({
                icon: 'question',
                title: 'Add voter as a candidate',
                backdrop: true,
                allowOutsideClick: false,
                confirmButtonText: "Yes",
                showDenyButton: true
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info',
                        title: 'Adding Voter',
                        html: 'Please wait..',
                        backdrop: true,
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                add_form_ca = true
                                const req = await fetchtimeout('/control/elections/candidates/add-voter-as-candidate/', {
                                    method: 'POST',
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    },
                                    body: new FormData(this)
                                })
                                if(req.ok) {
                                    const res = await req.json()
                                    add_form_ca = false
                                    $("body").find(".selected_voter").val('')
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info',
                                        title: res.txt,
                                        html: res.msg,
                                        backdrop: true,
                                        allowOutsideClick: false,
                                    }).then( async () => {
                                        if(res.status) {
                                            $(this).find('input[type="reset"]').click() 
                                            await ca.search('')
                                            await ca.candidates()
                                        }
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                add_form_ca = false
                                $("body").find(".selected_voter").val('')
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Connection error',
                                    html: e.message,
                                    backdrop: true,
                                    allowOutsideClick: false,
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    //close add ca confirmation 
    $(".confirm_add_ca").click( function (e) {
        if($(e.target).hasClass("confirm_add_ca")){
            e.preventDefault() 
            const parent = $(".confirm_add_ca")
            const child = $(".confirm_add_ca_main") 
            child.addClass(child.attr("animate-out")) 
            setTimeout( () => {
                parent.addClass("hidden")
                parent.removeClass("flex")
                child.removeClass(child.attr("animate-out")) 
                $("body").find(".selected_voter").val('')
            }, 500)
        }
    })
    $(".confirm_add_ca").find(".close_confirm_ca").click( () => {
        const parent = $(".confirm_add_ca")
        const child = $(".confirm_add_ca_main") 
        child.addClass(child.attr("animate-out")) 
        setTimeout( () => {
            parent.addClass("hidden")
            parent.removeClass("flex")
            child.removeClass(child.attr("animate-out")) 
            $("body").find(".selected_voter").val('')
        }, 500)
    })

    //accept candidate 
    let accept_ca = false
    $(".election_candidates_list").delegate(".accept_candidate_req", "click", async function (e) {
        e.preventDefault() 
        let data = new FormData() 
        data.append("id", $(this).attr("data")) 
        if(!accept_ca){
            Swal.fire({
                icon: 'question', 
                title: 'Accept candidacy form', 
                html: 'Are sure you want to accept this candidacy form?', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                denyButtonText: 'Cancel', 
                confirmButtonText: 'Accept'
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Accepting candidacy form', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading() 
                            accept_ca = true
                            try {
                                const req = await fetchtimeout('/control/elections/candidates/accept-candidacy/', {
                                    method: 'POST',
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok) {
                                    const res = await req.json() 
                                    accept_ca = false
                                    socket.emit('candidacy-form-accepted', {candidacyID: $(this).attr("data").trim()})
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.txt, 
                                            html: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        })
                                        await ca.candidates()
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.txt, 
                                            html: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        })
                                    }
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                accept_ca = false
                                Swal.fire({
                                    icon: 'error', 
                                    title: 'Connection error', 
                                    html: e.message, 
                                    backdrop: true, 
                                    allowOutsideClick: false,
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    //deny candidate 
    let deny_ca = false
    $(".election_candidates_list").delegate(".delete_candidate_req", "click", async function (e) {
        e.preventDefault() 
        let data = new FormData() 
        data.append("id", $(this).attr("data").trim())
        if(!deny_ca){
            Swal.fire({
                icon: 'question', 
                title: 'Temporary Delete candidacy form', 
                html: 'Are you want to delete this candidacy form?', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                denyButtonText: 'Cancel', 
                confirmButtonText: 'Delete'
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        input: 'textarea',
                        title: 'Enter Message', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showDenyButton: true,
                        confirmButtonText: 'Submit',
                        denyButtonText: 'Cancel', 
                        inputValidator: (val) => {
                            if(val !== ''){
                                data.append("msg", val)
                                Swal.fire({
                                    icon: 'info', 
                                    title: 'Deleting candidacy form', 
                                    html: 'Please wait...', 
                                    backdrop: true, 
                                    allowOutsideClick: false, 
                                    showConfirmButton: false, 
                                    willOpen: async () => {
                                        Swal.showLoading() 
                                        deny_ca = true
                                        try {
                                            const req = await fetchtimeout('/control/elections/candidates/delete-candidacy/', {
                                                method: 'POST',
                                                headers: {
                                                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                                }, 
                                                body: data
                                            })
                                            if(req.ok) {
                                                const res = await req.json() 
                                                deny_ca = false
                                                if(res.status){
                                                    Swal.fire({
                                                        icon: 'success', 
                                                        title: res.txt, 
                                                        html: res.msg, 
                                                        backdrop: true, 
                                                        allowOutsideClick: false,
                                                    })
                                                    await ca.candidates()
                                                } else {
                                                    Swal.fire({
                                                        icon: 'info', 
                                                        title: res.txt, 
                                                        html: res.msg, 
                                                        backdrop: true, 
                                                        allowOutsideClick: false,
                                                    })
                                                }
                                            } else {
                                                throw new Error(`${req.status} ${req.statusText}`)
                                            }
                                        } catch (e) {
                                            deny_ca = false
                                            Swal.fire({
                                                icon: 'error', 
                                                title: 'Connection error', 
                                                html: e.message, 
                                                backdrop: true, 
                                                allowOutsideClick: false,
                                            })
                                        }
                                    }
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    //candidacy form delete permanently
    let delete_ca = false
    $(".election_candidates_list").delegate(".delete_candidate_req_permanent", "click", async function(e) {
        e.preventDefault() 
        let data = new FormData() 
        data.append("id", $(this).attr("data").trim())
        if(!delete_ca){
            Swal.fire({
                icon: 'question', 
                title: 'Delete candidate permanently', 
                html: 'Are you sure you want to delete this candidate permanently?', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                denyButtonText: 'Cancel', 
                confirmButtonText: 'Delete'
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Deleting candidate', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading() 
                            delete_ca = true
                            try {
                                const req = await fetchtimeout('/control/elections/candidates/delete/', {
                                    method: 'POST',
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok) {
                                    const res = await req.json() 
                                    delete_ca = false
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.txt, 
                                            html: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        })
                                        await ca.candidates()
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.txt, 
                                            html: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        })
                                    }
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                delete_ca = false
                                Swal.fire({
                                    icon: 'error', 
                                    title: 'Connection error', 
                                    html: e.message, 
                                    backdrop: true, 
                                    allowOutsideClick: false,
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    //remove candidate 
    let remove_ca = false
    $(".election_candidates_list").delegate(".remove_candidate", "click", async function(e) {
        e.preventDefault() 
        if(!remove_ca) {
            Swal.fire({
                icon: 'question', 
                title: 'Remove Candidate', 
                html: 'This will remove the candidate permanently',
                backdrop: true, 
                allowOutsideClick: false, 
                confirmButtonText: "Remove", 
                showDenyButton: true, 
                denyButtonText: "Cancel"
            }).then( (a) => {
                if(a.isConfirmed) {
                    Swal.fire({
                        icon: 'info', 
                        title: 'Removing Candidate', 
                        html: 'Please Wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                remove_ca = true 
                                let data = new FormData() 
                                data.append("id", $(this).attr("data"))
                                const req = await fetchtimeout('/control/election/candidates/remove-candidate/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    remove_ca = false
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false
                                    }).then( async () => {
                                        await ca.candidates()
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                remove_ca = false 
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
    //sort candidates 
    let sort_ca = false
    $(".sort_candidates").change( async function () {
        if(!sort_ca) {
            try {
                sort_ca = true 
                $(".election_candidates_list").find(".election_candidate_skeleton").show() 
                $(".election_candidates_list").find(".election_candidate").hide()
                let data = new FormData() 
                data.append("sort", $(this).val())
                const req = await fetchtimeout('/control/election/candidates/sort/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text()
                    sort_ca = false
                    $(".election_candidates_list").find(".election_candidate").remove()
                    $(".election_candidates_list").find(".election_candidate_skeleton").hide() 
                    $(".election_candidates_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                sort_ca = false 
                $(".election_candidates_list").find(".election_candidate_skeleton").hide() 
                $(".election_candidates_list").find(".election_candidate").show()
                ca.error(e.message)
            }
        }
    })
    //search candidate 
    let search_ca = false 
    $(".search_candidate").keyup( async function () {
        if(!search_ca){
            try {
                search_ca = true 
                $(".election_candidates_list").find(".election_candidate_skeleton").show() 
                $(".election_candidates_list").find(".election_candidate").hide()
                let data = new FormData() 
                data.append("search", $(this).val())
                const req = await fetchtimeout('/control/election/candidates/search/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text()
                    search_ca = false
                    $(".election_candidates_list").find(".election_candidate").remove()
                    $(".election_candidates_list").find(".election_candidate_skeleton").hide() 
                    $(".election_candidates_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                search_ca = false 
                $(".election_candidates_list").find(".election_candidate_skeleton").hide() 
                $(".election_candidates_list").find(".election_candidate").show()
                ca.error(e.message)
            }
        }
    })

    //web socket 
    //new voter file for candidacy 
    socket.on('new-voter-file-for-candidacy', async (data) => {
        if($("html").attr("data") === data.election){
            alertify.notify('New voter filed for candidacy!')
            await ca.candidates()
        }
    })
    //get election candidates 
    setTimeout( async () => {
        await ca.candidates()
    }, 1000)
    const ca = {
        candidates: async () => {
            try {
                $(".election_candidates_list").find(".election_candidate_skeleton").show() 
                $(".election_candidates_list").find(".election_candidate").remove() 
                const req = await fetchtimeout('/control/elections/candidates/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok) {
                    const res = await req.text() 
                    $(".election_candidates_list").find(".election_candidate_skeleton").hide() 
                    $(".election_candidates_list").append(res)
                } else{ 
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                ca.error(e.message)
            }
        },
        search: async (search) => {
            try {
                search_usr = true
                let data = new FormData()
                data.append("search", search)
                $(".users_for_ca_list").find(".user_for_ca_skeleton").show()
                $(".users_for_ca_list").find(".user_for_ca").remove()
                const req = await fetchtimeout('/control/elections/candidates/search-users/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    },
                    body: data
                })
                if(req.ok) {
                    const res = await req.text()
                    search_usr = false
                    $(".users_for_ca_list").find(".user_for_ca_skeleton").hide()
                    $(".users_for_ca_list").find(".user_for_ca").remove()
                    $(".users_for_ca_list").append(res)
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