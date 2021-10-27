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
    const container = document.querySelector('.nav')
    SwipeListener(container)
    container.addEventListener('swipe', function (e) {
        if(e.detail.directions.left){
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
    //open candidacy form 
    $(".e_menu").delegate(".file_candidacy_open", "click", async function (e)  {
        e.preventDefault() 
        const parent = $(".file_candidacy_")
        const child = $(".file_candidacy_main")
        child.addClass(child.attr("animate-in")) 
        parent.removeClass("hidden") 
        parent.addClass("flex") 
        let candidate = await election.candidacy_status()
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
                const req = await fetchtimeout('/home/election/submit-candidacy-form/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    candidacy_form = false
                    await election.candidacy_status()
                    $(this).find("button[type='submit']").html(def)
                    if(res.status){
                        socket.emit('file-candidacy')
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
    // delete candidacy form
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
                                const req = await fetchtimeout('/home/election/delete-candidacy/', {
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
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        }).then( async () => {
                                            await election.file_candidacy()
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
    // retry candidacy form  
    let retry_candidacy = false
    $(".file_candidacy_").delegate(".retry_candidacy", "click", async function (e) {
        e.preventDefault() 
        if(!retry_candidacy){
            Swal.fire({
                icon: 'question', 
                title: 'Submit Candidacy form again',
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                confirmButtonText: 'Yes'
            }).then( (a) => {
                if(a.isConfirmed) {
                    Swal.fire({
                        icon: 'info', 
                        title: 'Resubmitting candidacy form', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading()
                            retry_candidacy = true 
                            try {
                                const req = await fetchtimeout('/home/election/re-submit-candidacy-form/', {
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    },
                                    method: 'POST', 
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    retry_candidacy = false 
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false,
                                        }).then( async () => {
                                            await election.candidacy_status()
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
                                retry_candidacy = false
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
    $(".e_menu").delegate(".theme_open", "click", function (e) {
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
    $(".e_menu").delegate(".e_join_election", "click", function (e) {
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
                                const join = await fetchtimeout('/home/join-election/', {
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    },
                                    method: 'POST', 
                                    body: data
                                })
                                if(join.ok){
                                    const res = await join.json() 
                                    if(res.joined){
                                        socket.emit('success-join-election', {electionID: res.electionID})
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg,
                                            html: 'Redirecting...',
                                            backdrop: true,
                                            allowOutsideClick: false, 
                                            showConfirmButton: false,
                                            willOpen: () => {
                                                Swal.showLoading()
                                                setTimeout( async () => {
                                                    await election.status() 
                                                    Swal.close()
                                                    $(".cls_nav").click()
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
    $(".e_menu").delegate(".e_left_election", "click", function (e) {
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
                            const leave = await fetchtimeout('/home/leave-election/', {
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
                                        allowOutsideClick: false,
                                        showConfirmButton: false, 
                                        willOpen: async () => {
                                            Swal.showLoading()
                                            setTimeout( () => {
                                                window.location.href = "/home/"
                                            }, 2000)
                                        }
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'info', 
                                        title: res.msg, 
                                    })
                                }
                            } else {
                                console.log(leave)
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
    //react ca 
    let react_ca  = false
    $(".react_ca").click( async function (e) {
        e.preventDefault() 
        const def = $(this).html() 
        if(!react_ca){
            react_ca = true 
            $(this).html(election.loader()) 
            try {
                let data = new FormData() 
                data.append("caID", $(this).attr("data"))
                const req = await fetchtimeout("react-candidate/", {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.json()
                    $(this).html(def)
                    react_ca = false
                    Snackbar.show({ 
                        text: res.msg, 
                        duration: 2000,
                        showAction: false
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                react_ca = false 
                $(this).html(def)
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                            <span>Failed to react!</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }
    })
    let view_ca = false 
    $(".view_ca").click( async function (e) {
        e.preventDefault() 
        const parent = $(".view_ca_")
        const child = $(".view_ca_main") 
        const def = $(this).html()
        if(!view_ca){
            try {
                view_ca = true 
                $(this).html(election.loader())
                let data = new FormData() 
                data.append("caID", $(this).attr("data"))
                const req = await fetchtimeout('view-candidate/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text()
                    view_ca = false 
                    $(this).html(def)
                    child.addClass(child.attr("animate-in"))
                    parent.addClass("flex")
                    parent.removeClass("hidden")
                    setTimeout( () => {
                        child.removeClass(child.attr("animate-in"))
                    }, 300)
                    $(".view_ca_").find(".loader_ca").hide() 
                    $(".view_ca_").find(".ca_tabs").remove()
                    $(".view_ca_").find(".tabs_ca").append(res)
                } else {
                    throw new Error(e)
                }
            } catch (e) {
                view_ca = false
                $(this).html(def)
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                            <span>Failed to get candidate information</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }
    })
    $(".view_ca_").click( function (e) {
        if($(e.target).hasClass("view_ca_")){
            e.preventDefault() 
            const parent = $(".view_ca_")
            const child = $(".view_ca_main") 
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                child.removeClass(child.attr("animate-out"))
                parent.addClass("hidden")
                parent.removeClass("flex")
            }, 300)
        }
    })
    //candidate tab 
    $(".ca_tab").click( async function (e) {
        e.preventDefault() 
        //hide all tabs 
        $(".ca_tabs").hide() 
        $(`.${$(this).attr("data")}`).show()
    })
    //voter 
    let vote = false
    $(".submit-vote").submit( async function (e) {
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html() 
        if(!vote){
            $(this).find("button[type='submit']").html(election.loader()) 
            vote = true
            try {
                const req = await fetchtimeout('submit-vote/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    $(this).find("button[type='submit']").html(def) 
                    $(this).find("button[type='reset']").click()
                    vote = false
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg, 
                        backdrop: true, 
                        confirmButtonText: res.status ? 'Thank You' : 'OK',
                        allowOutsideClick: false
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                $(this).find("button[type='submit']").html(def) 
                vote = false
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
    //open account settings 
    $(".account_settings_open").click( async () => {
        const parent = $(".account_settings_")
        const child =  $(".account_settings_main")
        child.addClass(child.attr("animate-in"))
        parent.removeClass("hidden")
        parent.addClass("flex")
        await user.settingsMenu()
        setTimeout( () => {
            child.removeClass(child.attr("animate-in"))
        }, 500)
    })
    $(".cls_ac_settings").click( async () => {
        const parent = $(".account_settings_")
        const child =  $(".account_settings_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            child.removeClass(child.attr("animate-out"))
            parent.removeClass("flex")
            parent.addClass("hidden")
        }, 500)
    })
     //show password 
    $("body").delegate(".show_pass", "click", function () {
        const show = `<i class="fas fa-eye dark:text-indigo-600 cursor-pointer"></i>`
        const hide = `<i class="fas fa-eye-slash dark:text-indigo-600 cursor-pointer"></i>`
        if($(this).prev().attr("type") === "password"){
            $(this).prev().attr("type", "text")
            $(this).html(hide)
        } else {
            $(this).prev().attr("type", "password")
            $(this).html(show)
        }
    })
    $(".account_settings_").click( function (e) {
        if($(e.target).hasClass("account_settings_")){
            e.preventDefault()
            const parent = $(".account_settings_")
            const child =  $(".account_settings_main")
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                child.removeClass(child.attr("animate-out"))
                parent.removeClass("flex")
                parent.addClass("hidden")
                $(".account_settings_menu").find(".account_settings_menu").remove()
                $(".account_settings_menu").find(".account_settings_preload").show()
            }, 500)
        }
    })
    $(".account_settings").delegate(".back_account_settings", "click", async function () {
        const def = $(this).html()
        $(this).html(election.loader()) 
        await user.settingsMenu()
        $(".account_settings").find('.account_settings_item').remove()
        $(this).html(def)
        $(this).hide() 
    })
    $(".account_settings").delegate(".account_settings_menu_open", "click", async function () {
        const def = $(this).find('.settings_ic').html() 
        $(this).find('.settings_ic').html(election.loader())
        await user.settings($(this).attr("data"))
        $(".back_account_settings").show()
    })
    //change course & year 
    let change_cy = false 
    $(".account_settings").delegate(".change_cy", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html() 
        if(!change_cy){
            try {
                change_cy = true 
                $(this).find("button[type='submit']").html(election.loader()) 
                const req = await fetchtimeout('/account/settings/menu/change-cy/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json()
                    toast.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.msg, 
                        timer: 2000
                    }).then( async () => {
                        res.status ? await user.settings($(this).attr("data")) : ''
                        change_cy = false
                        $(this).find("button[type='submit']").html(def) 
                        $(this).find("button[type='reset']").click()
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                change_cy = false
                $(this).find("button[type='submit']").html(def) 
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
    })
    //change user type 
    let change_type = false 
    $(".account_settings").delegate(".change_usertype", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html() 
        if(!change_type){
            try {
                change_type = true 
                $(this).find("button[type='submit']").html(election.loader()) 
                const req = await fetchtimeout('/account/settings/menu/change-user-type/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json()
                    toast.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.msg, 
                        timer: 2000
                    }).then( async () => {
                        res.status ? await user.settings($(this).attr("data")) : ''
                        change_type = false
                        $(this).find("button[type='submit']").html(def) 
                        $(this).find("button[type='reset']").click()
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                change_type = false
                $(this).find("button[type='submit']").html(def) 
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
    })
    //change email 
    let change_mail = false 
    $(".account_settings").delegate(".change_email", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html() 
        if(!change_mail){
            try {
                change_mail = true 
                $(this).find("button[type='submit']").html(election.loader()) 
                const req = await fetchtimeout('/account/settings/menu/change-e-mail/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json()
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg,
                        backdrop: true, 
                        allowOutsideClick: false,
                    }).then( async () => {
                        res.status ? await user.settings($(this).attr("data")) : ''
                        change_mail = false
                        $(this).find("button[type='submit']").html(def) 
                        $(this).find("button[type='reset']").click()
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                change_mail = false
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
    //remove email 
    let remove_email = false 
    $(".account_settings").delegate(".remove_email", "click", async function (e) {
        e.preventDefault() 
        const def = $(this).html()
        if(!remove_email){
            Swal.fire({
                icon: 'question', 
                title: 'Remove E-mail ?', 
                html: 'Are you sure you want to remove this email', 
                showDenyButton: true, 
                confirmButtonText: 'Remove', 
                denyButtonText: 'Cancel',
                backdrop: true, 
                allowOutsideClick: false
            }).then( (s) => {
                if(s.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Removing E-mail', 
                        html: 'Please wait...',
                        allowOutsideClick: false,
                        backdrop: true,
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                $(this).html(election.loader())
                                remove_email = true 
                                let data = new FormData() 
                                data.append("id", $(this).attr("data"))
                                const req = await fetchtimeout("/account/settings/email/remove-email/", {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: data
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    $(this).html(def)
                                    remove_email = false  
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false, 
                                    }).then( async () => {
                                        await user.settings($(this).attr("data-settings"))
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e){
                                $(this).html(def)
                                remove_email = false 
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
    //add email in secure page 
    let secure_add_email = false
    $(".secure_add_email").submit( async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html()
        if(!secure_add_email){
            try {
                secure_add_email = true 
                $(this).find("button[type='submit']").html(election.loader()) 
                const req = await fetchtimeout('/account/settings/secure/add-email/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json()
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg,
                        backdrop: true, 
                        allowOutsideClick: false,
                    }).then( async () => {
                        secure_add_email = false
                        $(this).find("button[type='submit']").html(def) 
                        $(this).find("button[type='reset']").click()
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                secure_add_email = false
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
    //cahnge username 
    let change_username = false 
    $(".account_settings").delegate(".change_username", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html() 
        if(!change_username){
            try {   
                $(this).find("button[type='submit']").html(election.loader()) 
                change_username = true
                const req = await fetchtimeout('/account/settings/username/change-username/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    $(this).find("button[type='reset']").click()
                    $(this).find("button[type='submit']").html(def) 
                    change_username = false
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg, 
                        backdrop: true, 
                        allowOutsideClick: false
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                $(this).find("button[type='submit']").html(def) 
                change_username = false
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
    let change_password = false
    $(".account_settings").delegate(".change_password", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html() 
        if(!change_password) {
            try {   
                $(this).find("button[type='submit']").html(election.loader()) 
                change_password = true
                const req = await fetchtimeout('/account/settings/password/change-password/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    $(this).find("button[type='reset']").click()
                    $(this).find("button[type='submit']").html(def) 
                    change_password = false
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg, 
                        backdrop: true, 
                        allowOutsideClick: false
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                $(this).find("button[type='submit']").html(def) 
                change_password = false
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
    //socket events 
    //get total reactions & views of all candidates 
    setInterval( () => {
        if($(".candidates").length > 0){
            socket.emit("candidates-reactions&views", (res) => {
                if(res.status){
                    for(let i = 0; i < res.candidates.length; i++){
                        $(`[data='reaction-${res.candidates[i].id}']`).html(res.candidates[i].reactions.length > 1 ? `${res.candidates[i].reactions.length} Reactions` : `${res.candidates[i].reactions.length} Reaction`)
                        $(`[data='view-${res.candidates[i].id}']`).html(res.candidates[i].views.length > 1 ? `${res.candidates[i].views.length} Views` : `${res.candidates[i].views.length} View`)
                    }
                }
            })
        }
    }, 1000)
    //new election started 
    socket.on("new-election-started", async (data) => {
        const electionID = $("meta[name='electionID']").attr("content")
        if(electionID === data.electionID){
            await election.status()
            await election.status_menu()
        }
    })
    //new election ended 
    socket.on("new-election-ended", async (data) => {
        const electionID = $("meta[name='electionID']").attr("content")
        if(electionID === data.electionID){
            await election.status()
            await election.status_menu()
        }
    })
    //election changed 
    socket.on("election-changed", async (data) => {
        const isjoined = $("html").attr("joined")
        if(isjoined === "false"){
            await election.status()
        } else {
            if($(".election__").text().trim() !== ""){
                await election.status()
            }
        }
    })
    //if voter is accepted
    socket.on('voter-accepted', async (data) => {
        alertify.notify('Voter request accepted')
        if($("html").attr("joined") === "true"){
            await election.status() 
            await election.status_menu()
        } else {
            socket.emit('election-status', {electionID: data.electionID}, (res) => {
                if (res.status) {
                    //set election title 
                    $(`div[data='election-${res.data.id}'`).find("#election_title").html(res.data.election.title)
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
    //user 
    const user = {
        settingsMenu: async () => {
            try {
                const req = await fetchtimeout('/account/settings-menu/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                })
                if(req.ok){
                    const res = await req.text()
                    $(".account_settings_menu").find(".account_settings_preload").hide() 
                    $(".account_settings_menu").find(".account_settings_menu").remove()
                    $(".account_settings_menu").append(res)
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
        settings: async (menu) => {
            try {
                $(".account_settings").find('.account_settings_item').remove()
                const req = await fetchtimeout(`/account/settings/${menu}/`, {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".account_settings").find('.account_settings_preload').removeClass('flex') 
                    $(".account_settings").find('.account_settings_preload').removeClass('hidden') 
                    $(".account_settings").find('.account_settings_menu_items').remove()
                    $(".account_settings").find('.account_settings_menu').append(res)
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
    //election
    const election = {
        file_candidacy: async () => {
            try {
                const req = await fetchtimeout('/home/election/file-candidacy-form/', {
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
                const req = await fetchtimeout('/home/election/candidacy-status/', {
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
        }, 
        status: async () => {
            try {
                const req = await fetchtimeout('/home/election/status/main/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    timeout: 2000
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
        }, 
        status_menu: async () => {
            try {
                const req = await fetchtimeout('/home/election/status/side-menu/', {
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
        }
    }
})
