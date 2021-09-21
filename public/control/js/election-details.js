$(document).ready(() => {
    //get the election starting time  
    let e_start = (new Date($("body").find("#e_time").attr("data")).getTime() / 1000), start = false
    let flipdown = new FlipDown(e_start, "e_time")
    flipdown.start()
    flipdown.ifEnded(() => {
        //check if the flipDown started attr is = to true 
        const status = $("body").find("#e_time").attr("started")
        if (status !== "true") {
            alert("fasfs")
        }
    })
    //set the theme of flipdown 
    const theme = localStorage.getItem('theme') === "dark" ? true : false
    $("body").find("#e_time").removeClass(theme ? 'flipdown__theme-dark' : 'flipdown__theme-light')
    $("body").find("#e_time").addClass(theme ? 'flipdown__theme-light' : 'flipdown__theme-dark')

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
                election.voters("/control/elections/accepted-voters/", $("html").attr("data"))
            }   
        }, 2000)
    })
    $(".e_ac").click( () => {
        $(".acp_voters").find(".acp_voters_skeleton").show()
        $(".acp_voters").find(".voters").remove()
        election.voters("/control/elections/accepted-voters/", $("html").attr("data"))
    })
    $(".e_pend").click( () => {
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
    // pending voters
    let ac_v = false 
    $(".acp_voters").delegate(".accept_voter", "click", async function (e) {
        e.preventDefault() 
        const data = new FormData()
        const def = $(this).html()  
        data.append("id", $(this).attr("data"))
        if(!ac_v){
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
                    if(res.status){
                        toast.fire({
                            title: res.msg, 
                            icon: 'success', 
                            timer: 2000
                        }).then( () => {
                            $(`.voters[data='${ $(this).attr("data")}']`).remove() 
                        })
                    } else {
                        toast.fire({
                            title: res.msg, 
                            icon: 'info', 
                            timer: 2000
                        })
                    }
                } else {
                    ac_v = false
                    throw new Error(`${accept.status} ${accept.statusText}`)
                }
            } catch (e) {
                ac_v = false
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
        } else {
            Snackbar.show({ 
                text: 'Please Wait', 
                duration: 3000,
                showAction: false
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
                        //send event to websocket that the election is updated
                        new_partylist(res.id)
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
        if(!searching && $(this).val !== ''){
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
                    const res = await search.json()
                    searching = false
                    console.log(res)
                } else {
                    throw new Error(`${search.status} ${search.statusText}`)
                }
            } catch (e) {
                searching = false
                console.log(e.message)
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
    $(".settings_").click( function(e) {
        if($(e.target).hasClass("settings_")){
            $(".settings_main").addClass($(".settings_main").attr("animate-out"))
            setTimeout(() => {
                $(".settings_").addClass("hidden")
                $(".settings_").removeClass("flex")
                $(".settings_main").removeClass($(".settings_main").attr("animate-out"))
            }, 300)
        }
    })
    $(".close_settings").click( () => {
        $(".settings_main").addClass($(".settings_main").attr("animate-out"))
        setTimeout(() => {
            $(".settings_").addClass("hidden")
            $(".settings_").removeClass("flex")
            $(".settings_main").removeClass($(".settings_main").attr("animate-out"))
        }, 300)
    })
    $(".back_settings").click( function() {
        $(".card_settings_form").html('')
        $(this).hide() 
        $('.card_settings').show(500)
    })
    let settings = false
    $(".election_settings_btn").click( async function() {
        const def = $(this).find(".settings_ic").html() 
        if(!settings){
            settings = true 
            $(this).find(".settings_ic").html(election.loader())
            try {
                const req = await fetchtimeout(`/control/elections/settings/${$(this).attr("data")}`, {
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
    //chnage electin title
    let e_change_title = false
    $(".card_settings_form").delegate(".edit_election_title", "submit", async function(e) {
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html()
        if(!e_change_title){
            try {
                e_change_title = true 
                $(this).find("button[type='submit']").html(election.loader())
                const req = await fetchtimeout('/control/election/change-title/', {
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
    //functions 
    const election = {
        voters: async (link, id) => {
            const data = new FormData() 
            data.append("id", id)
            try {
                const ac = await fetchtimeout(link, {
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }, 
                    method: 'POST', 
                    body: data
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
            $("body").find("p#election_title").text(title)
        }
    }
})