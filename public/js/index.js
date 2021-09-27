$(document).ready( () => { 
    //open navigation 
    $(".open_nav").click( () => {
        const parent = $(".nav") 
        const child = $(".nav_main") 
        child.addClass(child.attr("animate-in")) 
        parent.removeClass("hidden") 
        setTimeout( () => {
            child.removeClass(child.attr("animate-in")) 
        }, 300)
    }) 
    //close navigation 
    $(".cls_nav").click( () => {
        const parent = $(".nav") 
        const child = $(".nav_main") 
        child.addClass(child.attr("animate-out")) 
        setTimeout( () => {
            parent.addClass("hidden") 
            child.removeClass(child.attr("animate-out")) 
        }, 300)
    })
    $(".nav").click( function(e) {
        if($(e.target).hasClass("nav")){
            const parent = $(".nav") 
            const child = $(".nav_main") 
            child.addClass(child.attr("animate-out")) 
            setTimeout( () => {
                parent.addClass("hidden") 
                child.removeClass(child.attr("animate-out")) 
            }, 300)
        }
    })
    //check selected theme 
    if(gettheme() === 'dark'){
        $(".theme_dark").addClass("active-b-green")
    } 
    if(gettheme() === 'default' || gettheme() === null){
        $(".theme_default").addClass("active-b-green")
    } 
    //change theme to dark 
    $(".theme_dark").click( function () {
        $(".theme_btn_select").removeClass("active-b-green")
        $('html').addClass("dark") 
        localStorage.setItem("theme", "dark") 
        $('html').removeClass("default wmsu")
        $("meta[name='theme-color']").attr("content", "#161b22")
        $(this).addClass("active-b-green")
        //set the theme of flipdown 
        const themer = localStorage.getItem('theme') === "dark" ? true : false
        $("#e_time").removeClass(themer ? 'flipdown__theme-dark' : 'flipdown__theme-light')
        $("#e_time").addClass(themer ? 'flipdown__theme-light' : 'flipdown__theme-dark')
    })
    $(".theme_default").click( function () {
        $(".theme_btn_select").removeClass("active-b-green")
        $('html').addClass("default") 
        localStorage.setItem("theme", "default") 
        $('html').removeClass("dark wmsu")
        $("meta[name='theme-color']").attr("content", "#6b21a8")
        $(this).addClass("active-b-green")
        //set the theme of flipdown 
        const themer = localStorage.getItem('theme') === "dark" ? true : false
        $("#e_time").removeClass(themer ? 'flipdown__theme-dark' : 'flipdown__theme-light')
        $("#e_time").addClass(themer ? 'flipdown__theme-light' : 'flipdown__theme-dark')
    })
    //opne candidacy form 
    $(".file_candidacy_open").click( async function (e) {
        e.preventDefault() 
        let candidate = await election.candidacy_status()
        const parent = $(".file_candidacy_")
        const child = $(".file_candidacy_main")
        child.addClass(child.attr("animate-in")) 
        parent.removeClass("hidden") 
        parent.addClass("flex")
        if(!candidate){
            await election.file_candidacy()
        }
        setTimeout( () => {
            child.removeClass(child.attr("animate-in")) 
        }, 500)
    })
    // close candidacy form
    $(".file_candidacy_").click( function (e) {
        if($(e.target).hasClass("file_candidacy_")) {
            e.preventDefault() 
            const parent = $(".file_candidacy_")
            const child = $(".file_candidacy_main")
            child.addClass(child.attr("animate-out")) 
            setTimeout( () => {
                parent.removeClass("flex") 
                parent.addClass("hidden")
                child.removeClass(child.attr("animate-out")) 
                $(".fl_candidacy_form").find(".fl_candidacy").remove() 
                $(".fl_candidacy_form").find('.loading_fl').removeClass("hidden")
                $(".fl_candidacy_form").find('.loading_fl').addClass("flex")
            }, 500)
        }
    })
    // close candidacy form
    $(".cls_fl_c").click( function (e) {
        e.preventDefault() 
        const parent = $(".file_candidacy_")
        const child = $(".file_candidacy_main")
        child.addClass(child.attr("animate-out")) 
        setTimeout( () => {
            parent.removeClass("flex") 
            parent.addClass("hidden")
            child.removeClass(child.attr("animate-out")) 
            $(".fl_candidacy_form").find(".fl_candidacy").remove() 
            $(".fl_candidacy_form").find('.loading_fl').removeClass("hidden")
            $(".fl_candidacy_form").find('.loading_fl').addClass("flex")
        }, 500)
    })
    //submit candidacy form 
    let candidacy_form = false
    $(".file_candidacy_").delegate(".fl_candidacy", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html()
        if(!candidacy_form){
            candidacy_form = true 
            $(this).find("button[type='submit']").html(election.loader())
            try {   
                const req = await fetchtimeout('/election/submit-candidacy-form/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    candidacy_form = false
                    $(this).find("button[type='submit']").html(def)
                    if(res.status){
                        await election.candidacy_status()
                        Swal.fire({
                            icon: 'success', 
                            title: res.txt,
                            html: res.msg, 
                            backdrop: true, 
                            allowOutsideClick: false,
                        })
                    } else {
                        candidacy_form = false
                        $(this).find("button[type='submit']").html(def)
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
                candidacy_form = false
                $(this).find("button[type='submit']").html(def)
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
    let delete_my_candidacy = false 
    $(".file_candidacy_").delegate(".delete_candidacy", "click", async function (e) {
        e.preventDefault() 
        let data = new FormData() 
        data.append("candidateID", $(this).attr("data"))
        if(!delete_my_candidacy){
            Swal.fire({
                icon: 'question', 
                title: 'Delete Candidacy', 
                html: 'Are you sure would you like to delete your candidacy form', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                confirmButtonText: 'Yes'
            }).then( (ad) => {
                if(ad.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Deleting candidacy', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading() 
                            delete_my_candidacy = true
                            try {
                                const req = await fetchtimeout('/election/delete-candidacy/', {
                                    method: 'POST',
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    delete_my_candidacy = false 
                                    if(res.status){
                                        await election.file_candidacy()
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg,
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
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                delete_my_candidacy = false 
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
    //open themes 
    $(".theme_open").click( function (e) {
        e.preventDefault() 
        const parent = $(".theme_")
        const child = $(".theme_main")
        child.addClass(child.attr("animate-in")) 
        parent.removeClass("hidden") 
        parent.addClass("flex")
        setTimeout( () => {
            child.removeClass(child.attr("animate-in")) 
        }, 500)
    })
    //close themes
    $(".cls_themes").click( function (e) {
        e.preventDefault() 
        const parent = $(".theme_")
        const child = $(".theme_main")
        child.addClass(child.attr("animate-out")) 
        setTimeout( () => {
            parent.removeClass("flex") 
            parent.addClass("hidden")
            child.removeClass(child.attr("animate-out")) 
        }, 500)
    })
    //close themes
    $(".theme_").click( function (e) {
        if($(e.target).hasClass("theme_")){
            const parent = $(".theme_")
            const child = $(".theme_main")
            child.addClass(child.attr("animate-out")) 
            setTimeout( () => {
                parent.removeClass("flex") 
                parent.addClass("hidden")
                child.removeClass(child.attr("animate-out")) 
            }, 500)
        }
    })
    //join election 
    $(".e_join_election").click( function (e) {
        e.preventDefault() 
        let data = new FormData() 
        Swal.fire({
            icon: 'question',
            title: 'Enter election passcode',  
            backdrop: true, 
            confirmButtonText: 'Join',
            allowOutsideClick: false, 
            input: 'text',
            inputPlaceholder: 'Passcode',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
                autocomplete: 'off',
                required: 'true'
            },
            showDenyButton: true,
            denyButtonText: 'Cancel',
            inputValidator: (val) => {
                if(val){
                    data.append("code", val)
                    Swal.fire({
                        icon: 'info', 
                        html: 'Please wait...', 
                        title: 'Joining to election', 
                        showConfirmButton: false,
                        backdrop: true,
                        allowOutsideClick: false, 
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                const join = await fetchtimeout('join-election/', {
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    },
                                    method: 'POST', 
                                    body: data
                                })
                                if(join.ok){
                                    const res = await join.json() 
                                    if(res.joined){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg,
                                            html: 'Redirecting...',
                                            backdrop: true,
                                            allowOutsideClick: false, 
                                            showConfirmButton: false,
                                            willOpen: () => {
                                                Swal.showLoading()
                                                setTimeout( () => {
                                                    window.location.assign('')
                                                }, 1000)
                                            }
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.msg, 
                                            html: res.text,
                                            backdrop: true,
                                            allowOutsideClick: false, 
                                        })
                                    }
                                } else {
                                    throw new Error(`${join.status} ${join.statusText}`)
                                }
                            } catch (e) {
                                Swal.fire({
                                    icon: 'error', 
                                    title: 'Connection Error', 
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
    })
    //leave election 
    $(".e_left_election").click( function (e) {
        e.preventDefault() 
        Swal.fire({
            icon: 'question', 
            title: 'Are you sure you want to leave?', 
            backdrop: true, 
            showDenyButton: true, 
            cancelButtonText: 'No',
            confirmButtonText: 'Yes', 
        }).then( (res) => {
            if(res.isConfirmed){
                Swal.fire({
                    title: 'Leaving election', 
                    html: 'Please wait...', 
                    backdrop: true, 
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    willOpen: async () => {
                        Swal.showLoading() 
                        try {
                            const leave = await fetchtimeout('/leave-election', {
                                headers: {
                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                }, 
                                method: 'POST'
                            })
                            if(leave.ok){
                                const res = await leave.json()
                                if(res.leave){
                                    Swal.fire({
                                        icon: 'success', 
                                        title: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false
                                    }).then( () => {
                                        window.location.assign('')
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'info', 
                                        title: res.msg, 
                                    })
                                }
                            } else {
                                throw new Error(`${leave.status} ${leave.statusText}`)
                            }
                        } catch (e) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Connection Error', 
                                html: e.message
                            })
                        }
                    }
                })
            }
        })
    })
    //election 
    const election = {
        file_candidacy: async () => {
            try {
                const req = await fetchtimeout('/election/file-candidacy-form/', {
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    method: 'POST'
                })
                if(req.ok) {
                    const res = await req.text() 
                    $(".fl_candidacy_form").find(".fl_candidacy, .ca_status").remove()
                    $(".fl_candidacy_form").find(".loading_fl").addClass("hidden")
                    $(".fl_candidacy_form").find(".loading_fl").removeClass("flex")
                    $(".fl_candidacy_form").find(".ca_status").remove()
                    $(".fl_candidacy_form").append(res)
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
        }, 
        candidacy_status: async () => {
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
                        $(".loading_fl").addClass("hidden")
                        $(".loading_fl").removeClass("flex")
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
        },
        loader: () => {
            return '<i class="fad animate-spin fa-spinner-third"></i>'
        }
    }
})