$(document).ready(() => {
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
        setTimeout( async () => {
            if($(this).attr("data") === "settings"){
                election.settingsMenu()
            } 
            if($(this).attr("data") === "positions"){
                election.positions()
            }
            if($(this).attr("data") === "courses"){
                election.courses()
            }
            if($(this).attr("data") === "year"){
                election.year()
            }
        }, 500)
    })
    //cloe view voter information
    $(".user_info").click( function (e) {
        if($(e.target).hasClass("user_info")){
            e.preventDefault() 
            const child = $(".user_info_main") 
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                $(this).removeClass("flex")
                $(this).addClass("hidden")
                child.removeClass(child.attr("animate-out"))
            }, 500)
        }
    })
    $(".cls_user_info").click( () => {
        const parent = $(".user_info")
        const child = $(".user_info_main") 
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            parent.removeClass("flex")
            parent.addClass("hidden")
            child.removeClass(child.attr("animate-out"))
        }, 500)
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
    //positions 
    $(".positions_").click( function(e) {
        if($(e.target).hasClass("positions_")){
            $(".positions_main").addClass($(".positions_main").attr("animate-out"))
            setTimeout(() => {
                $(".positions_").addClass("hidden")
                $(".positions_").removeClass("flex")
                $(".positions_main").removeClass($(".positions_main").attr("animate-out"))
                $(".positions_").find(".preload_positions").removeClass("hidden")
                $(".positions_").find(".preload_positions").addClass("flex")
                $(".positions_").find(".positions_data_list").remove()
            }, 300)
        }
    })
    $(".close_positions").click( () => {
        $(".positions_main").addClass($(".positions_main").attr("animate-out"))
        setTimeout(() => {
            $(".positions_").addClass("hidden")
            $(".positions_").removeClass("flex")
            $(".positions_main").removeClass($(".positions_main").attr("animate-out"))
            $(".positions_").find(".preload_positions").removeClass("hidden")
            $(".positions_").find(".preload_positions").addClass("flex")
            $(".positions_").find(".positions_data_list").remove()
        }, 300)
    })

    //add positions 
    let add_pos = false
    $(".positions_").delegate(".add_pos_e", "submit", async function (e) {
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html()
        try {
            add_pos = true 
            $(this).find("button[type='submit']").html(election.loader()) 
            const req = await fetchtimeout('/control/elections/add-position/', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                }, 
                body: new FormData(this)
            })
            if(req.ok) {
                const res = await req.json() 
                add_pos = false
                $(this).find("button[type='submit']").html(def) 
                if(res.status){
                    toast.fire({
                        icon: 'success', 
                        title: res.msg,
                        timer: 2000
                    })   
                    await election.positions()
                } else {
                    toast.fire({
                        icon: 'info', 
                        title: res.msg,
                        timer: 2000
                    })
                }
            } else {
                throw new Error(`${req.status} ${req.statusText}`)
            }
        } catch (e) {
            add_pos = false
            $(this).find("button[type='submit']").html(def) 
            toast.fire({
                icon: 'error', 
                title: e.message,
                timer: 2000
            })
        }
    })
    let remove_pos = false
    $(".positions_").delegate(".e_remove_position", "click", async function (e) {
        e.preventDefault() 
        if(!remove_pos){
            Swal.fire({
                icon: 'question', 
                title: 'Remove Position', 
                html: 'Are you sure you want to remove this position?', 
                backdrop: true, 
                allowOutsideClick: false, 
                confirmButtonText: 'Remove', 
                showDenyButton: true, 
                denyButtonText: 'Cancel'
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Removing Position', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading() 
                            try {
                                remove_pos = true 
                                let data = new FormData() 
                                data.append("id", $(this).attr("data"))
                                const req = await fetchtimeout('/control/elections/remove-position/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok) {
                                    const res = await req.json() 
                                    remove_pos = false
                                    if(res.status) {
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        }).then( () => {
                                            $(".positions_").find(`div[data='position-${$(this).attr("data")}']`).removeClass("animate__fadeInUp")
                                            $(".positions_").find(`div[data='position-${$(this).attr("data")}']`).addClass("animate__fadeOutDown")
                                            setTimeout( async () => {
                                                $(".positions_").find(`div[data='position-${$(this).attr("data")}']`).remove()
                                                await election.positions()
                                            }, 500)
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                remove_pos = false
                                Swal.fire({
                                    icon: 'error', 
                                    title: "Connection Error",
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
    //course 
    $(".courses_").click( function(e) {
        if($(e.target).hasClass("courses_")){
            $(".courses_main").addClass($(".courses_main").attr("animate-out"))
            setTimeout(() => {
                $(".courses_").addClass("hidden")
                $(".courses_").removeClass("flex")
                $(".courses_main").removeClass($(".courses_main").attr("animate-out"))
                $(".courses_").find(".courses").removeClass("hidden")
                $(".courses_").find(".courses").addClass("flex")
                $(".courses_").find(".courses_data_list").remove()
            }, 300)
        }
    })
    $(".close_courses").click( () => {
        $(".courses_main").addClass($(".courses_main").attr("animate-out"))
        setTimeout(() => {
            $(".courses_").addClass("hidden")
            $(".courses_").removeClass("flex")
            $(".courses_main").removeClass($(".courses_main").attr("animate-out"))
            $(".courses_").find(".courses").removeClass("hidden")
            $(".courses_").find(".courses").addClass("flex")
            $(".courses_").find(".courses_data_list").remove()
        }, 300)
    })
    //add course
    let add_crs = false
    $(".courses_").delegate(".add_crs_e", "submit", async function (e) {
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html()
        try {
            add_crs = true 
            $(this).find("button[type='submit']").html(election.loader()) 
            const req = await fetchtimeout('/control/elections/add-course/', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                }, 
                body: new FormData(this)
            })
            if(req.ok) {
                const res = await req.json() 
                add_crs = false
                $(this).find("button[type='submit']").html(def) 
                if(res.status){
                    toast.fire({
                        icon: 'success', 
                        title: res.msg,
                        timer: 2000
                    })   
                    await election.courses()
                    election.get_courses()
                } else {
                    toast.fire({
                        icon: 'info', 
                        title: res.msg,
                        timer: 2000
                    })
                }
            } else {
                throw new Error(`${req.status} ${req.statusText}`)
            }
        } catch (e) {
            add_crs = false
            $(this).find("button[type='submit']").html(def) 
            toast.fire({
                icon: 'error', 
                title: e.message,
                timer: 2000
            })
        }
    })
    let remove_crs = false
    $(".courses_").delegate(".e_remove_course", "click", async function (e) {
        e.preventDefault() 
        if(!remove_crs){
            Swal.fire({
                icon: 'question', 
                title: 'Remove Course', 
                html: 'Are you sure you want to remove this course?', 
                backdrop: true, 
                allowOutsideClick: false, 
                confirmButtonText: 'Remove', 
                showDenyButton: true, 
                denyButtonText: 'Cancel'
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Removing Course', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading() 
                            try {
                                remove_crs = true 
                                let data = new FormData() 
                                data.append("id", $(this).attr("data"))
                                const req = await fetchtimeout('/control/elections/remove-course/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok) {
                                    const res = await req.json() 
                                    remove_crs = false
                                    if(res.status) {
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        }).then( () => {
                                            $(".courses_").find(`div[data='course-${$(this).attr("data")}']`).removeClass("animate__fadeInUp")
                                            $(".courses_").find(`div[data='course-${$(this).attr("data")}']`).addClass("animate__fadeOutDown")
                                            setTimeout( async () => {
                                                $("course_").find(`div[data='course-${$(this).attr("data")}']`).remove()
                                                await election.courses()
                                                election.get_courses()
                                            }, 500)
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                remove_crs = false
                                Swal.fire({
                                    icon: 'error', 
                                    title: "Connection Error",
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
    //year 
    $(".year_").click( function(e) {
        if($(e.target).hasClass("year_")){
            $(".year_main").addClass($(".year_main").attr("animate-out"))
            setTimeout(() => {
                $(".year_").addClass("hidden")
                $(".year_").removeClass("flex")
                $(".year_main").removeClass($(".year_main").attr("animate-out"))
                $(".year_").find(".year").removeClass("hidden")
                $(".year_").find(".year").addClass("flex")
                $(".year_").find(".year_data_list").remove()
            }, 300)
        }
    })
    $(".close_year").click( () => {
        $(".year_main").addClass($(".year_main").attr("animate-out"))
        setTimeout(() => {
            $(".year_").addClass("hidden")
            $(".year_").removeClass("flex")
            $(".year_main").removeClass($(".year_main").attr("animate-out"))
            $(".year_").find(".year").removeClass("hidden")
            $(".year_").find(".year").addClass("flex")
            $(".year_").find(".year_data_list").remove()
        }, 300)
    })
    //add course
    let add_yr = false
    $(".year_").delegate(".add_year_e", "submit", async function (e) {
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html()
        try {
            add_yr = true 
            $(this).find("button[type='submit']").html(election.loader()) 
            const req = await fetchtimeout('/control/elections/add-year/', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                }, 
                body: new FormData(this)
            })
            if(req.ok) {
                const res = await req.json() 
                add_yr = false
                $(this).find("button[type='submit']").html(def) 
                if(res.status){
                    toast.fire({
                        icon: 'success', 
                        title: res.msg,
                        timer: 2000
                    })   
                    await election.year()
                    election.get_year()
                } else {
                    toast.fire({
                        icon: 'info', 
                        title: res.msg,
                        timer: 2000
                    })
                }
            } else {
                throw new Error(`${req.status} ${req.statusText}`)
            }
        } catch (e) {
            add_yr = false
            $(this).find("button[type='submit']").html(def) 
            toast.fire({
                icon: 'error', 
                title: e.message,
                timer: 2000
            })
        }
    })
    let remove_yr = false
    $(".year_").delegate(".e_remove_year", "click", async function (e) {
        e.preventDefault() 
        if(!remove_yr){
            Swal.fire({
                icon: 'question', 
                title: 'Remove Year', 
                html: 'Are you sure you want to remove this year?', 
                backdrop: true, 
                allowOutsideClick: false, 
                confirmButtonText: 'Remove', 
                showDenyButton: true, 
                denyButtonText: 'Cancel'
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Removing Year', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading() 
                            try {
                                remove_yr = true 
                                let data = new FormData() 
                                data.append("id", $(this).attr("data"))
                                const req = await fetchtimeout('/control/elections/remove-year/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok) {
                                    const res = await req.json() 
                                    remove_yr = false
                                    if(res.status) {
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        }).then( () => {
                                            $(".cyear_").find(`div[data='year-${$(this).attr("data")}']`).removeClass("animate__fadeInUp")
                                            $(".cyear_").find(`div[data='year-${$(this).attr("data")}']`).addClass("animate__fadeOutDown")
                                            setTimeout( async () => {
                                                $("year_").find(`div[data='year-${$(this).attr("data")}']`).remove()
                                                await election.year()
                                                election.get_year()
                                            }, 500)
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.msg, 
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                remove_yr = false
                                Swal.fire({
                                    icon: 'error', 
                                    title: "Connection Error",
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
    //get updated courses & year every 10seconds 
    setInterval( () => {
        election.get_year()
        election.get_courses()
    }, 10000)
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
                    socket.emit('election-change', {electionID: $("html").attr("data")})
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
                    socket.emit('election-change', {electionID: $("html").attr("data")})
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
    //socket 
    //get election data every 10 secs
    let election_deleted = false
    setInterval( () => {
        electionData($("html").attr("data"))
    }, 2000)

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
                    //update voters count 
                    $("body").find("#accepted_voter_count").html(res.data.voters.accepted)
                    //update voters voted count 
                    $("body").find("#voter_voter_count").html(res.data.voters.voted)
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
    //new election started 
    socket.on('new-election-started', async () => {
        await election.election_status()
        await election.dt()
    })
    //new election ended
    socket.on('new-election-ended', async () => {
        await election.election_status()
        await election.dt()
    })
    //functions 
    const election = {
        partylist: (id) => {
            const pty = JSON.parse($("body").find(".partylist").val())
            for(let i = 0; i < pty.length; i++){
                if(id === pty[i].id){
                    return pty[i].type
                }
            }
        }, 
        positions: async () => {
            try {
                const req = await fetchtimeout('/control/elections/position-list/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".positions_").find(".positions_data_list").remove()
                    $(".positions_").find(".preload_positions").addClass("hidden")
                    $(".positions_").find(".preload_positions").removeClass("flex")
                    $(".positions_").find(".positions_e_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                toast.fire({
                    icon: 'error',
                    title: e.message, 
                    timer: 2000
                })
            }
        },
        courses: async () => {
            try {
                const req = await fetchtimeout('/control/elections/courses-list/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".courses_").find(".courses_data_list").remove()
                    $(".courses_").find(".preload_courses").addClass("hidden")
                    $(".courses_").find(".preload_courses").removeClass("flex")
                    $(".courses_").find(".courses_e_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                toast.fire({
                    icon: 'error',
                    title: e.message, 
                    timer: 2000
                })
            }
        },
        get_courses: async () => {
            socket.emit('get-courses', (res) => {
                $(".e_course_list").html('')
                for(let i = 0; i < res.data.length; i++){
                    $(".e_course_list").append(`
                        <div style="border-color: rgba(126, 34, 206, 1)" class="border p-1 px-3 rounded-full cursor-pointer">
                            <span class="dark:text-gray-300/90 text-gray-100">${res.data[i]}</span>
                        </div> 
                    `)
                }
            })
        },
        year: async () => {
            try {
                const req = await fetchtimeout('/control/elections/year-list/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".year_").find(".year_data_list").remove()
                    $(".year_").find(".preload_year").addClass("hidden")
                    $(".year_").find(".preload_year").removeClass("flex")
                    $(".year_").find(".year_e_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                toast.fire({
                    icon: 'error',
                    title: e.message, 
                    timer: 2000
                })
            }
        },
        get_year: async () => {
            socket.emit('get-year', (res) => {
                $(".e_year_list").html('')
                for(let i = 0; i < res.data.length; i++){
                    $(".e_year_list").append(`
                        <div style="border-color: rgba(126, 34, 206, 1)" class="border p-1 px-3 rounded-full cursor-pointer">
                            <span class="dark:text-gray-300/90 text-gray-100">${res.data[i]}</span>
                        </div> 
                    `)
                }
            })
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
    }
})
