$(document).ready(() => {
    //ac = accepted, pend = pending, del = deleted
    let voters_tab = 'ac', candidates_tab = 'ac', candidates_tab_req = false
    //open navigation 
    $(".e_nav").click(() => {
        const nav = $(".e_nav_main")
        nav.addClass(nav.attr("animate-in"))
        nav.removeClass("xl:hidden")
        setTimeout(() => {
            nav.removeClass(nav.attr("animate-in"))
        }, 300)
    })
    //close navigation 
    $(".cls_e_nav").click(() => {
        const nav = $(".e_nav_main")
        nav.addClass(nav.attr("animate-out"))
        setTimeout(() => {
            nav.addClass("xl:hidden")
            nav.removeClass(nav.attr("animate-out"))
        }, 300)
    })
    $(".election_btn").click(function (e) {
        e.preventDefault()
        const parent = $(`.${$(this).attr("data")}_`)
        const child = $(`.${$(this).attr("data")}_main`)
        parent.addClass("flex")
        child.addClass(child.attr("animate-in"))
        parent.removeClass("hidden")
        setTimeout(() => {
            child.removeClass(child.attr("animate-in"))
        }, 500)
        setTimeout( () => {
            if($(this).attr("data") === "voters"){   
                election.voters("/control/elections/accepted-voters/")
            }   
            if($(this).attr("data") === "candidates" && !candidates_tab_req){   
                election.candidates("/control/elections/candidates/accepted-candidates/")
            }  
            if($(this).attr("data") === "settings"){
                election.settingsMenu()
            } 
        }, 1000)
    })
    $(".e_ac").click( () => {
        voters_tab = 'ac'
        $(".acp_voters").find(".acp_voters_skeleton").show()
        $(".acp_voters").find(".voters").remove()
        election.voters("/control/elections/accepted-voters/", $("html").attr("data"))
    })
    $(".e_pend").click( () => {
        voters_tab = 'pend'
        $(".acp_voters").find(".acp_voters_skeleton").show()
        $(".acp_voters").find(".voters").remove()
        election.voters("/control/elections/pending-voters/", $("html").attr("data"))
    })
    //close voters pop up 
    $(".close_voters").click(() => {
        $(".voters_main").addClass($(".voters_main").attr("animate-out"))
        setTimeout(() => {
            $(".voters_").addClass("hidden")
            $(".voters_").removeClass("flex")
            $(".voters_main").removeClass($(".voters_main").attr("animate-out"))
            $(".acp_voters").find(".acp_voters_skeleton").show()
            $(".acp_voters").find(".voters").remove()
        }, 300)
    })
    $(".voters_").click( function (e) {
        if($(e.target).hasClass("voters_")){
            $(".voters_main").addClass($(".voters_main").attr("animate-out"))
            setTimeout(() => {
                $(".voters_").addClass("hidden")
                $(".voters_").removeClass("flex")
                $(".voters_main").removeClass($(".voters_main").attr("animate-out"))
                $(".acp_voters").find(".acp_voters_skeleton").show()
                $(".acp_voters").find(".voters").remove()
            }, 300)
        }
    })
    // accept voter reqs
    let ac_v = false 
    $(".acp_voters").delegate(".accept_voter", "click", async function (e) {
        e.preventDefault() 
        const data = new FormData()
        const def = $(this).html()  
        data.append("id", $(this).attr("data"))
        if(!ac_v){
            Swal.fire({
                icon: 'question', 
                title: 'Accept Voter', 
                html: 'Are you sure you want to accept this voter?',
                backdrop: true, 
                allowOutsideClick: false,
                showDenyButton: true, 
                confirmButtonText: 'Accept',
                denyButtonText: 'Cancel', 
            }).then( (a) => {
                if(a.isConfirmed) {
                    Swal.fire({
                        icon: 'info', 
                        html: 'Please wait..', 
                        title: 'Accepting voter', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading()
                            ac_v = true
                            $(this).html('<i class="fad animate-spin fa-spinner-third"></i>')
                            try {
                                const accept = await fetchtimeout('/control/elections/accept-voter/', {
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    }, 
                                    method: 'POST', 
                                    body: data
                                })
                                if(accept.ok){
                                    const res = await accept.json() 
                                    ac_v = false
                                    $(this).html(def)
                                    //send event to server that this voter is accepted 
                                    socket.emit('voter-accepted', {voterID: $(this).attr("data")})
                                    if(res.status){
                                        Swal.fire({
                                            title: res.msg, 
                                            icon: 'success', 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    } else {
                                        Swal.fire({
                                            title: res.msg, 
                                            icon: 'info', 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                    await election.voters("/control/elections/pending-voters/", $("html").attr("data"))
                                    electionData($("html").attr("data"))
                                } else {
                                    ac_v = false
                                    throw new Error(`${accept.status} ${accept.statusText}`)
                                }
                            } catch (e) {
                                ac_v = false
                                $(this).html(def)
                                toast.fire({
                                    title: e.message, 
                                    icon: 'error', 
                                    timer: 2000
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    // cancel voter reqs
    let c_v = false 
    $(".acp_voters").delegate(".deny_voter", "click", async function (e) {
        e.preventDefault() 
        const data = new FormData()
        const def = $(this).html()  
        data.append("id", $(this).attr("data"))
        if(!c_v){
            Swal.fire({
                icon: 'question', 
                title: 'Delete voter request', 
                html: 'Are you sure you want to delete voter request?',
                backdrop: true, 
                allowOutsideClick: false,
                showDenyButton: true, 
                confirmButtonText: 'Yes',
                denyButtonText: 'No', 
            }).then( (a) => {
                if(a.isConfirmed) {
                    Swal.fire({
                        icon: 'info', 
                        html: 'Please wait', 
                        title: 'Deleting voter request', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading()
                            c_v = true
                            $(this).html('<i class="fad animate-spin fa-spinner-third"></i>')
                            try {
                                const accept = await fetchtimeout('/control/elections/deny-voter/', {
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    }, 
                                    method: 'POST', 
                                    body: data
                                })
                                if(accept.ok){
                                    const res = await accept.json() 
                                    c_v = false
                                    $(this).html(def)
                                    if(res.status){
                                        Swal.fire({
                                            title: res.msg, 
                                            icon: 'success', 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    } else {
                                        Swal.fire({
                                            title: res.msg, 
                                            icon: 'info', 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                    await election.voters("/control/elections/pending-voters/", $("html").attr("data"))
                                    electionData($("html").attr("data"))
                                } else {
                                    ac_v = false
                                    throw new Error(`${accept.status} ${accept.statusText}`)
                                }
                            } catch (e) {
                                c_v = false
                                $(this).html(def)
                                toast.fire({
                                    title: e.message, 
                                    icon: 'error', 
                                    timer: 2000
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    //add more partylists 
    let add_pty_e = false
    $(".partylist_").click( function(e) {
        if($(e.target).hasClass("partylist_")){
            $(".partylist_main").addClass($(".partylist_main").attr("animate-out"))
            setTimeout(() => {
                $(".partylist_").addClass("hidden")
                $(".partylist_").removeClass("flex")
                $(".partylist_main").removeClass($(".partylist_main").attr("animate-out"))
            }, 300)
        }
    })
    $(".close_partylist").click( () => {
        $(".partylist_main").addClass($(".partylist_main").attr("animate-out"))
        setTimeout(() => {
            $(".partylist_").addClass("hidden")
            $(".partylist_").removeClass("flex")
            $(".partylist_main").removeClass($(".partylist_main").attr("animate-out"))
        }, 300)
    })
    $(".add_pty_e").submit( async function(e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html() 
        if(!add_pty_e){
            try {
                add_pty_e = true
                $(this).find("button[type='submit']").html('<i class="fad animate-spin fa-spinner-third"></i>')
                const add = await fetchtimeout('/control/elections/e-add-pty/', {
                    method: 'POST',
                    body: new FormData(this), 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }
                })
                if(add.ok){
                    const res = await add.json()
                    if(res.add){
                        toast.fire({
                            title: res.msg,
                            icon: 'success', 
                            timer: 2000
                        }).then( () => {
                            add_pty_e = false
                            $(this).find("button[type='submit']").html(def)
                            $(".e_partylist_list").append(`
                                <div data="partylist-${res.id}" class="animate__animated animate__fadeInUp  dark_border grid grid-cols-2 justify-center items-center dark:bg-darkBlue-secondary shadow-lg dark:text-gray-400 px-3 py-2 rounded-lg">
                                    <span>${election.partylist(res.id)}</span>
                                    <div class="flex justify-end items-center">
                                        <a data="${res.id}" class="e_remove_partylist rpl rounded-md cursor-pointer text-xl dark:text-red-600 text-red-500">
                                            <i class="fad fa-times-circle"></i>
                                        </a>
                                    </div>
                                </div>
                            `)
                        })
                    } else {
                        toast.fire({
                            title: res.msg,
                            icon: 'info', 
                            timer: 2000
                        }).then( () => {
                            add_pty_e = false
                            $(this).find("button[type='submit']").html(def)
                        })
                    }
                } else {
                    throw new Error(`${add.status} ${add.statusText}`)
                }
            } catch (e) {
                add_pty_e = false
                $(this).find("button[type='submit']").html(def)
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgb(225, 29, 72)" class="fad fa-times-circle"></i>
                            <span>Error : ${e.message}</span>
                        </div>
                    `, 
                    duration: 2000,
                    showAction: false
                })  
            }
        }
    })
    //remove partylists 
    let e_remove_pty = false
    $(".partylist_").delegate(".e_remove_partylist", "click", async function (e) {
        e.preventDefault() 
        const data = new FormData()
        const def = $(this).html() 
        data.append("pty", $(this).attr("data")) 
        if(!e_remove_pty){
            try {
                e_remove_pty = true
                $(this).html('<i class="fad animate-spin fa-spinner-third"></i>')
                const remove_pty = await fetchtimeout("/control/elections/e-remove-partylist/", {
                    method: 'POST',
                    body: data, 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }
                }) 
                if(remove_pty.ok){
                    const res = await remove_pty.json() 
                    if(res.removed){
                        toast.fire({
                            title: res.msg, 
                            icon: 'success', 
                            timer: 2000
                        }).then( () => {
                            e_remove_pty = false
                            $(`div[data='partylist-${$(this).attr("data")}']`).remove()
                        })
                    } else {
                        toast.fire({
                            title: res.msg, 
                            icon: 'info', 
                            timer: 2000
                        }).then( () => {
                            e_remove_pty = false
                            $(this).html(def)
                        })
                    }
                    electionData($("html").attr("data"))
                } else {
                    throw new Error(`${remove_pty.status} ${remove_pty.statusText}`)
                }
            } catch (e) {
                e_remove_pty = false
                $(this).html(def)
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgb(225, 29, 72)" class="fad fa-times-circle"></i>
                            <span>Error : ${e.message}</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })  
            }
        }
    })
    //search voter 
    let searching = false
    $(".search-voter").keyup( async function () {
        let data = new FormData() 
        data.append("search", $(this).val())
        data.append("search_by", $(this).prev().val())
        data.append("tab", voters_tab)
        if(!searching && $(this).val() !== ''){
            searching = true
            try {
                const search = await fetchtimeout('/control/elections/search-voter/', {
                    method: 'POST', 
                    body: data, 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }
                })
                if(search.ok){
                    const res = await search.text()
                    searching = false
                    $(".acp_voters").html(res)
                } else {
                    throw new Error(`${search.status} ${search.statusText}`)
                }
            } catch (e) {
                searching = false
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgb(225, 29, 72)" class="fad fa-times-circle"></i>
                            <span>Error : ${e.message}</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })  
            }
        }
    })
    //candidates 
    $(".candidates_").click( function(e) {
        if($(e.target).hasClass("candidates_")){
            $(".candidates_main").addClass($(".candidates_main").attr("animate-out"))
            setTimeout(() => {
                $(".candidates_").addClass("hidden")
                $(".candidates_").removeClass("flex")
                $(".candidates_main").removeClass($(".candidates_main").attr("animate-out"))
            }, 300)
        }
    })
    $(".close_candidates").click( () => {
        $(".candidates_main").addClass($(".candidates_main").attr("animate-out"))
        setTimeout(() => {
            $(".candidates_").addClass("hidden")
            $(".candidates_").removeClass("flex")
            $(".candidates_main").removeClass($(".candidates_main").attr("animate-out"))
        }, 300)
    })
    $(".candidates_tab").click( async function (e) {
        e.preventDefault() 
        const def = $(this).html()
        $(".candidates_tab").removeClass("active-bg-amber active-bg-green active-bg-rose")
        $(this).html(election.loader())
        if($(this).attr("data") === 'ac' && !candidates_tab_req){
            candidates_tab = $(this).attr("data")
            candidates_tab_req = true
            await election.candidates("/control/elections/candidates/accepted-candidates/")
            $(".candidates_tab").removeClass("active-bg-amber active-bg-rose")
            $(this).addClass("active-bg-green")
            $(this).html(def)
            candidates_tab_req = false
        } else if($(this).attr("data") === 'pend' && !candidates_tab_req){
            candidates_tab = $(this).attr("data")
            candidates_tab_req = true
            await election.candidates("/control/elections/candidates/pending-candidates/")
            $(".candidates_tab").removeClass("active-bg-green active-bg-rose")
            $(this).addClass("active-bg-amber")
            $(this).html(def)
            candidates_tab_req = false
        } else if($(this).attr("data") === 'del' && !candidates_tab_req){
            candidates_tab = $(this).attr("data")
            candidates_tab_req = true
            await election.candidates("/control/elections/candidates/deleted-candidates/")
            $(".candidates_tab").removeClass("active-bg-amber active-bg-green")
            $(this).addClass("active-bg-rose")
            $(this).html(def)
            candidates_tab_req = false
        } else {
            candidates_tab = 'ac'
            candidates_tab_req = false
            $(".candidates_tab").removeClass("active-bg-amber active-bg-green active-bg-rose")
            $(this).html(def)
            return false
        }
    })
    //open candidacy form info
    let ca_info = false
    $(".candidates_").delegate(".user_candidates", "click", async function(e) { 
        e.preventDefault() 
        if(!ca_info && $(this).attr("data") !== undefined){
            Swal.fire({
                icon: 'info', 
                title: 'Getting candidate information', 
                html: 'Please wait...', 
                backdrop: true, 
                allowOutsideClick: false,
                showConfirmButton: false, 
                willOpen: async () => {
                    Swal.showLoading() 
                    ca_info = true 
                    await election.candidacy_information($(this).attr("data")) 
                    ca_info = false
                }
            })
        }
    })
    //sort candidates 
    let sorting_ca = false
    $(".candidates_").delegate(".sort-candidates-by", "change", async function (e) {
        e.preventDefault()  
        const search_by = $(this).val().split(",")
        if(!sorting_ca){
            sorting_ca = true 
            $(".candidates_").find(".acp_candidates_skeleton").fadeIn(100)
            $(".candidates_").find(".user_candidates").remove()
            await election.sort_candidates(search_by[0], search_by[1]) 
            sorting_ca = false
            $(".candidates_").find(".acp_candidates_skeleton").fadeOut(100)
        }
    })
    //close candidate form info 
    $(".candidacy-info").delegate(".close_candidacy_info", "click", async function(e) {
        $(".candidacy-info").find(".ca_info_main").addClass($(".candidacy-info").find(".ca_info_main").attr("animate-out")) 
        setTimeout( () => {
            $(".candidacy-info").find(".ca_info_").addClass("hidden")
            $(".candidacy-info").find(".ca_info_").removeClass("flex")
            $(".candidacy-info").find(".ca_info_main").removeClass($(".candidacy-info").find(".ca_info_main").attr("animate-out")) 
            $(".candidacy-info").html('')
        }, 500)
    })
    $(".candidacy-info").delegate(".ca_info_", "click", async function(e) {
        if($(e.target).hasClass("ca_info_")){
            $(".candidacy-info").find(".ca_info_main").addClass($(".candidacy-info").find(".ca_info_main").attr("animate-out")) 
            setTimeout( () => {
                $(".candidacy-info").find(".ca_info_").addClass("hidden")
                $(".candidacy-info").find(".ca_info_").removeClass("flex")
                $(".candidacy-info").find(".ca_info_main").removeClass($(".candidacy-info").find(".ca_info_main").attr("animate-out")) 
                $(".candidacy-info").html('')
            }, 500)
        }
    }) 
    //candidacy form deny
    let deny_ca = false
    $(".candidacy-info").delegate(".deny_candidacy", "click", async function(e) {
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
                                                    }).then( async () => {
                                                        await election.candidates("/control/elections/candidates/pending-candidates/")
                                                        await election.candidacy_information($(this).attr("data")) 
                                                    })
                                                } else {
                                                    Swal.fire({
                                                        icon: 'info', 
                                                        title: res.txt, 
                                                        html: res.msg, 
                                                        backdrop: true, 
                                                        allowOutsideClick: false,
                                                    })
                                                }
                                                electionData($("html").attr("data"))
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
    //candidacy form accept
    let accept_ca = false
    $(".candidacy-info").delegate(".accept_candidacy", "click", async function(e) {
        e.preventDefault() 
        let data = new FormData() 
        data.append("id", $(this).attr("data").trim())
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
                                    await election.candidates("/control/elections/candidates/pending-candidates/")  
                                    await election.candidacy_information($(this).attr("data")) 
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.txt, 
                                            html: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.txt, 
                                            html: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        })
                                    }
                                    electionData($("html").attr("data"))
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
    //candidacy form delete permanently
    let delete_ca = false
    $(".candidacy-info").delegate(".delete_permanent_candidacy", "click", async function(e) {
        e.preventDefault() 
        let data = new FormData() 
        data.append("id", $(this).attr("data").trim())
        if(!delete_ca){
            Swal.fire({
                icon: 'question', 
                title: 'Delete candidate permanently', 
                html: 'Are you sure would you like to delete this candidate permanently?', 
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
                                        }).then( async () => {
                                            await election.candidates("/control/elections/candidates/deleted-candidates/")
                                            $(".candidacy-info").find(".ca_info_main").addClass($(".candidacy-info").find(".ca_info_main").attr("animate-out")) 
                                            setTimeout( () => {
                                                $(".candidacy-info").find(".ca_info_").addClass("hidden")
                                                $(".candidacy-info").find(".ca_info_").removeClass("flex")
                                                $(".candidacy-info").find(".ca_info_main").removeClass($(".candidacy-info").find(".ca_info_main").attr("animate-out")) 
                                                $(".candidacy-info").html('')
                                            }, 500)
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.txt, 
                                            html: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        })
                                    }
                                    electionData($("html").attr("data"))
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
    //positions 
    $(".positions_").click( function(e) {
        if($(e.target).hasClass("positions_")){
            $(".positions_main").addClass($(".positions_main").attr("animate-out"))
            setTimeout(() => {
                $(".positions_").addClass("hidden")
                $(".positions_").removeClass("flex")
                $(".positions_main").removeClass($(".positions_main").attr("animate-out"))
            }, 300)
        }
    })
    $(".close_positions").click( () => {
        $(".positions_main").addClass($(".positions_main").attr("animate-out"))
        setTimeout(() => {
            $(".positions_").addClass("hidden")
            $(".positions_").removeClass("flex")
            $(".positions_main").removeClass($(".positions_main").attr("animate-out"))
        }, 300)
    })
    //settings
    $(".settings_").click(function(e) {
        if($(e.target).hasClass("settings_")){
            $(".settings_main").addClass($(".settings_main").attr("animate-out"))
            setTimeout(() => {
                $(".settings_").addClass("hidden")
                $(".settings_").removeClass("flex")
                $(".settings_main").removeClass($(".settings_main").attr("animate-out"))
                $(".card_settings_form").html('')
                $(".card_settings").show()
                $(".settings_main").find(".preload_settings").show()
                $(".settings_main").find(".settings_menus").remove()
            }, 300)
        }
    })
    $(".settings_").delegate(".close_settings", "click", () => {
        $(".settings_main").addClass($(".settings_main").attr("animate-out"))
        setTimeout(() => {
            $(".settings_").addClass("hidden")
            $(".settings_").removeClass("flex")
            $(".settings_main").removeClass($(".settings_main").attr("animate-out"))
            $(".card_settings_form").html('')
            $(".card_settings").show()
            $(".settings_main").find(".preload_settings").show()
                $(".settings_main").find(".settings_menus").remove()
        }, 300)
    })
    $(".settings_").delegate('.back_settings', 'click', async function() {
        const def = $(this).html() 
        $(this).html(election.loader())
        await election.settingsMenu()
        $(this).html(def)
        $(".card_settings_form").html('')
        $('.card_settings').show(500)
        $(".back_settings").hide(500)
    })
    let settings = false
    $(".settings_").delegate(".election_settings_btn", "click", async function() {
        const def = $(this).find(".settings_ic").html() 
        if(!settings){
            settings = true 
            $(this).find(".settings_ic").html(election.loader())
            try {
                const req = await fetchtimeout(`/control/elections/settings/${$(this).attr("data")}/`, {
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    method: 'POST'
                })
                if(req.ok){
                    settings = false 
                    $(this).find(".settings_ic").html(def)
                    const res = await req.text() 
                    $(".card_settings").hide()
                    $(".back_settings, .card_settings_form").fadeIn(500) 
                    $(".card_settings_form").html(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                settings = false
                $(this).find(".settings_ic").html(def)
                toast.fire({
                    icon: 'error', 
                    title: e.message, 
                    timer: 2000
                })
            }
        }
    })
    //chnage election title
    let e_change_title = false
    $(".settings_").delegate(".edit_election_title", "submit", async function(e) {
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html()
        if(!e_change_title){
            try {
                e_change_title = true 
                $(this).find("button[type='submit']").html(election.loader())
                const req = await fetchtimeout('/control/election/settings/change-title/', {
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    method: 'POST',
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json()
                    e_change_title = false
                    $(this).find("button[type='submit']").html(def)
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt,
                        html: res.msg
                    }).then( () => {
                        election.title($(this).find("input[name='e_title']").val())
                        $(this).find("input[name='e_title']").attr("placeholder", $(this).find("input[name='e_title']").val())
                        $(this).find("button[type='reset']").click()
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                e_change_title = false
                $(this).find("button[type='submit']").html(def)
                toast.fire({
                    timer: 2000, 
                    icon: 'error', 
                    title: e.message
                })
            }
        }
    })
    //change election description
    let e_change_description = false 
    $(".settings_").delegate(".edit_election_description", "submit", async function(e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html()
        if(!e_change_description){ 
            try {
                e_change_description = true
                $(this).find("button[type='submit']").html(election.loader())
                const req = await fetchtimeout('/control/election/settings/change-description/', {
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    method: 'POST',
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    e_change_description = false
                    $(this).find("button[type='submit']").html(def)
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt,
                        html: res.msg
                    }).then( () => {
                        election.description($(this).find("textarea[name='election_description']").val())
                        $(this).find("textarea[name='election_description']").attr("placeholder", $(this).find("textarea[name='election_description']").val())
                        $(this).find("button[type='reset']").click()
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                e_change_description = false 
                $(this).find("button[type='submit']").html(def)
                toast.fire({
                    timer: 2000, 
                    icon: 'error', 
                    title: e.message
                })
            }
        }
    })
    //change election passcode
    let e_change_passcode = false
    $(".settings_").delegate(".edit_election_passcode", "submit", async function(e) {
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html()
        if(!e_change_passcode){ 
            try {
                e_change_passcode = true
                $(this).find("button[type='submit']").html(election.loader())
                const req = await fetchtimeout('/control/election/settings/change-passcode/', {
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    method: 'POST',
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    e_change_passcode = false
                    $(this).find("button[type='submit']").html(def)
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt,
                        html: res.msg
                    }).then( () => {
                        $(this).find("input[name='e_passcode']").attr("placeholder", $(this).find("input[name='e_passcode']").val())
                        $(this).find("button[type='reset']").click()
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                e_change_passcode = false 
                $(this).find("button[type='submit']").html(def)
                toast.fire({
                    timer: 2000, 
                    icon: 'error', 
                    title: e.message
                })
            }
        }
    })
    //change election status 
    let e_status = false
    $(".settings_").delegate(".election_status_toggle", "change", async function(e) {
        e.preventDefault()
        const toggle = $(this).prop("checked")
        if(!e_status){
            if(toggle){
                //start election 
                Swal.fire({
                    icon: 'question', 
                    title: 'Start election', 
                    html: 'This will force to start the election',
                    showDenyButton: true, 
                    confirmButtonText: 'Start',
                    denyButtonText: 'Cancel', 
                    backdrop: true, 
                    allowOutsideClick: false,
                    willOpen: () => {
                        $(this).prop("checked", toggle ? false : true)
                    },
                }).then( (res) => {
                    if(res.isConfirmed){
                        Swal.fire({
                            icon: 'info',
                            title: 'Starting election', 
                            html: 'Please wait...', 
                            backdrop: true, 
                            showConfirmButton: false, 
                            allowOutsideClick: false, 
                            willOpen: async () => {
                                Swal.showLoading()
                                e_status = true
                                try {
                                    const req = await fetchtimeout('/control/election/settings/start-election/', {
                                        headers: {
                                            'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                        }, 
                                        method: 'POST'
                                    })
                                    if(req.ok){
                                        const res = await req.json() 
                                        e_status = false 
                                        if(res.status){
                                            Swal.fire({
                                                icon: 'success', 
                                                title: res.msg,
                                                backdrop: true, 
                                                allowOutsideClick: false, 
                                            }).then( async () => {
                                                $(this).prop("checked", res.e_status)
                                            })
                                        } else {
                                            Swal.fire({
                                                icon: 'info', 
                                                title: res.msg,
                                                backdrop: true, 
                                                allowOutsideClick: false, 
                                            }).then( () => {
                                                $(this).prop("checked", res.e_status)
                                            })
                                        }
                                        //get the election date & time 
                                        await election.dt()
                                        await election.election_status()
                                    } else {
                                        throw new Error(`${req.status} ${req.statusText}`)
                                    }
                                } catch (e) {
                                    e_status = false
                                    toast.fire({
                                        timer: 2000, 
                                        icon: 'error', 
                                        title: e.message
                                    })
                                }
                            },
                        })
                    }
                })
            } else {
                //terminate election 
                Swal.fire({
                    icon: 'question', 
                    title: 'Stop election', 
                    html: 'This will force to stop the election',
                    showDenyButton: true, 
                    confirmButtonText: 'Stop',
                    denyButtonText: 'Cancel', 
                    backdrop: true, 
                    allowOutsideClick: false,
                    willOpen: () => {
                        $(this).prop("checked", toggle ? false : true)
                    },
                }).then( (res) => {
                    if(res.isConfirmed){
                        Swal.fire({
                            icon: 'info',
                            title: 'Terminating election', 
                            html: 'Please wait...', 
                            backdrop: true, 
                            showConfirmButton: false, 
                            allowOutsideClick: false, 
                            willOpen: async () => {
                                Swal.showLoading()
                                e_status = true
                                try {
                                    const req = await fetchtimeout('/control/election/settings/stop-election/', {
                                        headers: {
                                            'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                        }, 
                                        method: 'POST'
                                    })
                                    if(req.ok){
                                        const res = await req.json() 
                                        e_status = false 
                                        if(res.status){
                                            Swal.fire({
                                                icon: 'success', 
                                                title: res.msg,
                                                backdrop: true, 
                                                allowOutsideClick: false, 
                                            }).then( () => {
                                                $(this).prop("checked", res.e_status)
                                            })
                                        } else {
                                            $(this).prop("checked", )
                                            Swal.fire({
                                                icon: 'info', 
                                                title: res.msg,
                                                backdrop: true, 
                                                allowOutsideClick: false, 
                                            }).then( () => {
                                                $(this).prop("checked", res.e_status)
                                            })
                                        }
                                        //get the election date & time 
                                        await election.dt()
                                        await election.election_status()
                                    } else {
                                        throw new Error(`${req.status} ${req.statusText}`)
                                    }
                                } catch (e) {
                                    e_status = false
                                    toast.fire({
                                        timer: 2000, 
                                        icon: 'error', 
                                        title: e.message
                                    })
                                }
                            },
                        })
                    }
                })
            }
        }
    })
    //change election starting date & time 
    let e_start_dt = false
    $(".settings_").delegate(".edit_election_start-dt", "submit", async function(e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html()
        if(!e_start_dt){
            e_start_dt = true 
            $(this).find("button[type='submit']").html(election.loader())
            try {
                const req = await fetchtimeout('/control/election/settings/edit-starting-dt/', {
                    body: new FormData(this),
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.json() 
                    e_start_dt = false
                    $(this).find("button[type='submit']").html(def)
                    election.start($(this).find(".dt").val())
                    if(res.status){
                        Swal.fire({
                            icon: 'success', 
                            title: res.msg,
                            backdrop: true, 
                            allowOutsideClick: false, 
                        })
                    } else {
                        Swal.fire({
                            icon: 'info', 
                            title: res.msg,
                            backdrop: true, 
                            allowOutsideClick: false, 
                        })
                    }
                    await election.dt()
                    await election.election_status()
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                e_start_dt = false
                $(this).find("button[type='submit']").html(def)
                toast.fire({
                    timer: 2000, 
                    icon: 'error', 
                    title: e.message
                })
            }
        }
    })
    //change election starting date & time 
    let e_end_dt = false
    $(".settings_").delegate(".edit_election_end-dt", "submit", async function(e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html()
        if(!e_end_dt){
            e_end_dt = true 
            $(this).find("button[type='submit']").html(election.loader())
            try {
                const req = await fetchtimeout('/control/election/settings/edit-ending-dt/', {
                    body: new FormData(this),
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.json() 
                    e_end_dt = false
                    $(this).find("button[type='submit']").html(def)
                    election.end($(this).find(".dt").val())
                    if(res.status){
                        Swal.fire({
                            icon: 'success', 
                            title: res.msg,
                            backdrop: true, 
                            allowOutsideClick: false, 
                        })
                    } else {
                        Swal.fire({
                            icon: 'info', 
                            title: res.msg,
                            backdrop: true, 
                            allowOutsideClick: false, 
                        })
                    }
                    await election.dt()
                    await election.election_status()
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                e_end_dt = false
                $(this).find("button[type='submit']").html(def)
                toast.fire({
                    timer: 2000, 
                    icon: 'error', 
                    title: e.message
                })
            }
        }
    })
    //change election autoAccept voters 
    let auto_ac_v = false
    $(".settings_").delegate(".auto_accept_voters", "change", async function(e) {
        e.preventDefault() 
        const toggle = $(this).prop("checked")
        if(!auto_ac_v){
            Swal.fire({
                title: 'Are you sure', 
                html: toggle ? 'You want to enable auto accept voters feature with this election' : 'You want to disable auto accept voters feature with this election',
                icon: 'question', 
                backdrop: true, 
                allowOutsideClick: false, 
                confirmButtonText: 'Yes', 
                showDenyButton: true, 
                denyButtonText: 'No',
                willOpen: () => {
                    $(this).prop("checked", toggle ? false : true)
                }
            }).then( (r) => {
                if(r.isConfirmed){
                    let data = new FormData() 
                    data.append("ac_v", toggle)
                    auto_ac_v = true
                    Swal.fire({
                        html: 'Please wait...',
                        title: 'Updating election', 
                        icon: 'info',
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                const req = await fetchtimeout('/control/election/settings/auto-accept-voters/', {
                                    method: 'POST', 
                                    body: data,
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }
                                })
                                if(req.ok) {
                                    const res = await req.json() 
                                    auto_ac_v = false
                                    $(this).prop("checked", res.autoAccept)
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.txt,
                                            html: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false, 
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false, 
                                        })
                                    }
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                auto_ac_v = false
                                toast.fire({
                                    timer: 2000, 
                                    icon: 'error', 
                                    title: e.message
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    //change election autoAccept candidates 
    let auto_ac_c = false
    $(".settings_").delegate(".auto_accept_candidates", "change", async function(e) {
        e.preventDefault() 
        const toggle = $(this).prop("checked")
        if(!auto_ac_c){
            Swal.fire({
                title: 'Are you sure', 
                html: toggle ? 'You want to enable auto accept candidates feature with this election' : 'You want to disable auto accept candidates feature with this election',
                icon: 'question', 
                backdrop: true, 
                allowOutsideClick: false, 
                confirmButtonText: 'Yes', 
                showDenyButton: true, 
                denyButtonText: 'No',
                willOpen: () => {
                    $(this).prop("checked", toggle ? false : true)
                }
            }).then( (r) => {
                if(r.isConfirmed){
                    let data = new FormData() 
                    data.append("ac_c", toggle)
                    auto_ac_c = true
                    Swal.fire({
                        html: 'Please wait...',
                        title: 'Updating election', 
                        icon: 'info',
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                const req = await fetchtimeout('/control/election/settings/auto-accept-candidates/', {
                                    method: 'POST', 
                                    body: data,
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }
                                })
                                if(req.ok) {
                                    const res = await req.json() 
                                    auto_ac_c = false
                                    $(this).prop("checked", res.autoAccept)
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.txt,
                                            html: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false, 
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false, 
                                        })
                                    }
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                auto_ac_c = false
                                toast.fire({
                                    timer: 2000, 
                                    icon: 'error', 
                                    title: e.message
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    // delete election 
    let delete_election = false
    $(".settings_").delegate(".election_settings_delete_election", "click", async () => {
        const def = $(this).find(".settings_ic").html() 
        if(!delete_election){
            delete_election = true 
            $(this).find(".settings_ic").html(election.loader())  
            Swal.fire({
                icon: 'question',
                title: 'Delete Election', 
                html: 'Are you sure you want to delete this election, <br> This process cannot be undone', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                showConfirmButton: true, 
                confirmButtonText: 'Yes'
            }).then( (rs) => {
                if(rs.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Checking election', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading() 
                            try {
                                const req = await fetchtimeout('/control/election/settings/delete-election/', {
                                    method: 'POST',
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }
                                })
                                if(req.ok) {
                                    const res = await req.json() 
                                    delete_election = false
                                    $(this).find(".settings_ic").html(def)
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.txt,
                                            html: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false, 
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.txt,
                                            html: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false, 
                                        })
                                    }
                                    await election.election_status()
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                delete_election = false
                                $(this).find(".settings_ic").html(def)
                                toast.fire({
                                    icon: 'error', 
                                    title: e.message, 
                                    timer: 2000
                                })
                            }
                        }
                    })
                }
            })
        }
    })
    //functions 
    const election = {
        voters: async (link) => {
            try {
                const ac = await fetchtimeout(link, {
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }, 
                    method: 'POST'
                })
                if(ac.ok){
                    const res = await ac.text() 
                    $(".acp_voters").find(".acp_voters_skeleton").hide()
                    $(".acp_voters").find(".voters").remove()
                    $(".acp_voters").append(res)
                } else {
                    throw new Error(`${ac.status} ${ac.statusText}`)
                }
            } catch (e) {
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgb(225, 29, 72)" class="fad fa-times-circle"></i>
                            <span>Error : ${e.message}</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })  
            }
        }, 
        candidates: async (link) => {
            try {
                const ac = await fetchtimeout(link, {
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }, 
                    method: 'POST'
                })
                if(ac.ok){
                    const res = await ac.text() 
                    $(".candidates_list").find(".acp_candidates_skeleton").hide()
                    $(".candidates_list").find(".user_candidates").remove()
                    $(".candidates_list").append(res)
                } else {
                    throw new Error(`${ac.status} ${ac.statusText}`)
                }
            } catch (e) {
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgb(225, 29, 72)" class="fad fa-times-circle"></i>
                            <span>Error : ${e.message}</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })  
            }
        },
        partylist: (id) => {
            const pty = JSON.parse($("body").find(".partylist").val())
            for(let i = 0; i < pty.length; i++){
                if(id === pty[i].id){
                    return pty[i].type
                }
            }
        }, 
        loader: () => {
            return '<i class="fad animate-spin fa-spinner-third"></i>'
        }, 
        title: (title) => {
            $("html").find("p#election_title, title").text(title)
        }, 
        description: (descrip) => {
            $("html").find("p#election_description").text(descrip)
        },
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
        settingsMenu: async () => {
           try {
               const req = await fetchtimeout('/control/elections/status/settings-menu/', {
                   method: 'POST',
                   headers: {
                       'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                   }
               })
               if(req.ok){
                   const res = await req.text()
                   $(".settings_main").find(".preload_settings").hide()
                   $(".settings_main").find(".settings_menus").remove()
                   $(".settings_main").append(res)
               } else {
                   throw new Error(`${req.status} ${req.statusText}`)
               }
           } catch (e) {
               console.log(e)
           }
        }, 
        start: (dt) => {
            $("p#e_start_status").text(moment(dt).tz("Asia/Manila").format('MMMM DD YYYY, h:mm a'))
        }, 
        end: (dt) => {
            $("p#e_end_status").text(moment(dt).tz("Asia/Manila").format('MMMM DD YYYY, h:mm a'))
        }, 
        deleted_candidates_count: (n) => {
            return `<div class="e_del_count_ca absolute right-[-2px] top-[-7px] dark:bg-purple-700 bg-purple-500 text-gray-50 dark:text-gray-300 w-5 h-5 text-center rounded-full text-sm">${n}</div>`
        }, 
        candidacy_information: async (id) => {
            let data = new FormData() 
            data.append("id", id)
            try {
                const req = await  fetchtimeout('/control/elections/candidates/candidacy-information/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text()
                    setTimeout( () => {
                        Swal.close() 
                        $(".candidacy-info").html(res)
                        $(".candidacy-info").find(".ca_info_").addClass("flex")
                        $(".candidacy-info").find(".ca_info_").removeClass("hidden")
                        $(".candidacy-info").find(".ca_info_main").addClass($(".candidacy-info").find(".ca_info_main").attr("animate-in"))
                        setTimeout( () => {
                            $(".candidacy-info").find(".ca_info_main").removeClass($(".candidacy-info").find(".ca_info_main").attr("animate-in"))
                        }, 500)
                    }, 1000)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                Swal.fire({
                    icon: 'error', 
                    title: 'Connection error', 
                    html: e.message, 
                    backdrop: true, 
                    allowOutsideClick: false,
                })
            }
        }, 
        sort_candidates: async (sort_by, id) => {
            let data = new FormData() 
            data.append("search_by", sort_by) 
            data.append("id", id.trim()) 
            data.append("tab", candidates_tab)
            try {
                const req = await fetchtimeout('/control/election/candidates/sort/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".candidates_").find(".candidates_list").append(res)
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
        }
    }
    //get election data every 10 secs
    setInterval( () => {
        electionData($("html").attr("data"))
    }, 2500)
})
