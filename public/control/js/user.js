$(document).ready( function (){
    setTimeout( async () => {
        await Data.users()
    }, 1000)
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
    //add user 
    $(".add_user_open").click( () => {
        const parent = $(".add_user")
        const child = $(".add_user_main")
        child.addClass(child.attr("animate-in"))
        parent.addClass("flex")
        parent.removeClass("hidden")
        setTimeout( () => {
            child.removeClass(child.attr("animate-in"))
        }, 300)
    })
    //close add user 
    $(".add_user").click( function (e) {
        if($(e.target).hasClass("add_user")){
            const parent = $(".add_user")
            const child = $(".add_user_main")
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                parent.addClass("hidden")
                parent.removeClass("flex")
                child.removeClass(child.attr("animate-out"))
            }, 300)
        }
    })
    $(".close_add_user").click( function (e) {
        const parent = $(".add_user")
        const child = $(".add_user_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            parent.addClass("hidden")
            parent.removeClass("flex")
            child.removeClass(child.attr("animate-out"))
        }, 300)
    })
    //side menu 
    $(".side_menu_open").click( () => {
        const parent = $(".side_menu_user")
        const child = $(".side_menu_user_main") 
        child.addClass(child.attr("animate-in"))
        parent.removeClass("hidden")
        parent.addClass("flex")
        setTimeout( () => {
            child.removeClass(child.attr("animate-in"))
        }, 300)
    })
    //close side menu 
    $(".close_side_menu").click( () => {
        const parent = $(".side_menu_user")
        const child = $(".side_menu_user_main") 
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            parent.addClass("hidden")
            parent.removeClass("flex")
            child.removeClass(child.attr("animate-out"))
        }, 300)
    })
    $(".side_menu_user").click( function (e) {
        if($(e.target).hasClass("side_menu_user")){
            e.preventDefault()
            const parent = $(".side_menu_user")
            const child = $(".side_menu_user_main") 
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                parent.addClass("hidden")
                parent.removeClass("flex")
                child.removeClass(child.attr("animate-out"))
            }, 300)
        }
    })
    //add user submit 
    let add_user = false
    $(".add_user_form").submit( async function (e) {
        e.preventDefault() 
        console.log('fsaffaf')
        const def = $(this).find("button[type='submit']").html() 
        try {
            if(!add_user){
                add_user = true
                const req = await fetchtimeout("/control/users/add-user/", {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    },
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    add_user = false 
                    $(this).find("button[type='submit']").html(def) 
                    if(res.status){
                        $(this).find("button[type='reset']").click()
                        toast.fire({
                            icon: 'success', 
                            title: res.msg, 
                            timer: 3000
                        })
                        await Data.users()
                    } else {
                        toast.fire({
                            icon: 'info', 
                            title: res.msg, 
                            timer: 3000
                        })
                    }
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            }
        } catch (e) {
            add_user = false 
            $(this).find("button[type='submit']").html(def) 
            toast.fire({
                icon: 'error', 
                title: e.message, 
                timer: 2000
            })
        }
    })
    //search user 
    let search_user = false 
    $(".search_user_input").keyup( function () {
        if(!search_user && $(this).val()){
            search_user = true 
            setTimeout( async () => {
                await Data.search_user($(this).val())
            }, 1000)
        }
    })
    let sort_users = false 
    $(".sort_users").change( async function () {
        if(!sort_users && $(this).val()){
            sort_users = true 
            await Data.sort_users($(this).val())
        }
    })
    //open more info 
    let more_info = false, id
    $(".all_users_list").delegate(".more_info_user", "click", async function (e) { 
        e.preventDefault() 
        if(!more_info){
            Swal.fire({
                icon: 'info', 
                title: 'Getting User Information', 
                html: 'Please wait...', 
                backdrop: true, 
                allowOutsideClick: false, 
                showConfirmButton: false, 
                willOpen: async () => {
                    Swal.showLoading()
                    try {
                        let data = new FormData() 
                        data.append("id", $(this).attr("data"))
                        more_info = true 
                        id = $(this).attr("data")
                        const req = await fetchtimeout('/control/users/info/', {
                            method: 'POST', 
                            headers: {
                                'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                            }, 
                            body: data
                        })
                        if(req.ok){
                            const res = await req.text() 
                            more_info = false
                            const parent = $(".user_info")
                            const child = $(".user_info_main")
                            setTimeout( () => {
                                Swal.close()
                                $(".user_info").find(".info_main_list").html(res)
                                child.addClass(child.attr("animate-in"))
                                parent.addClass("flex")
                                parent.removeClass("hidden") 
                                setTimeout( () => {
                                    child.removeClass(child.attr("animate-in"))
                                }, 600)
                            }, 500)
                        } else {
                            throw new Error(`${req.status} ${req.statusText}`)
                        }
                    } catch (e) {
                        more_info = false 
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
    })
    //more info menu 
    let menu = false
    $(".user_info_menu").click( async function (e) {
        e.preventDefault()
        if(!menu){
            menu = true
            Data.info_menu(id, $(this).attr("data")).then( (res) => {
                menu = false
            }).catch( (e) => {
                menu = false
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
            })
        }
    })
    //close user info 
    $(".user_info").click( function (e) {
        if($(e.target).hasClass("user_info")){
            e.preventDefault() 
            id = ''
            const parent = $(".user_info")
            const child = $(".user_info_main") 
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                parent.addClass("hidden")
                parent.removeClass("flex")
                child.removeClass(child.attr("animate-out"))
            }, 500)
        }
    })
    $(".cls_user_info").click( () => {
        id = ''
        const parent = $(".user_info")
        const child = $(".user_info_main") 
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            parent.addClass("hidden")
            parent.removeClass("flex")
            child.removeClass(child.attr("animate-out"))
        }, 500)
    })
    $(".side_nav").click( function (e) {
        if($(e.target).hasClass("side_nav")) {
            e.preventDefault() 
            const parent = $(".side_nav")
            const child = $(".side_nav_main") 
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                parent.removeClass("flex")
                parent.addClass("hidden")
                child.removeClass(child.attr("animate-out"))
            }, 500)
        }
    })
    $(".side_nav_open").click( () => {
        const parent = $(".side_nav")
        const child = $(".side_nav_main") 
        child.addClass(child.attr("animate-in")) 
        parent.addClass("flex")
        parent.removeClass("hidden")
        setTimeout( () => {
            child.removeClass(child.attr("animate-in")) 
        }, 500)
    })
    $(".close_side_nav").click( () => {
        const parent = $(".side_nav")
        const child = $(".side_nav_main") 
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            parent.removeClass("flex")
            parent.addClass("hidden")
            child.removeClass(child.attr("animate-out"))
        }, 500)
    })
    //reset all users account 
    let reset_acc = false
    $(".reset_all_users_account").click( () => {
        if(!reset_acc){
            Swal.fire({
                icon: 'warning', 
                title: 'Reset all users account', 
                html: 'Resetting all users acccount will restore the prevoiusly system generated username & password', 
                backdrop: true, 
                allowOutsideClick: false, 
                confirmButtonText: "Reset", 
                showDenyButton: true, 
                denyButtonText: "Cancel"
            }).then( (a) => {
                if(a.isConfirmed) {
                    Swal.fire({
                        icon: 'info', 
                        title: 'Resetting all users account', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false,
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                reset_acc = true
                                const req = await fetchtimeout('/control/users/reset-users-account/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    reset_acc = false
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false, 
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                reset_acc = false 
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
    const Data = {
        users: async () => {
            try {
                $(".all_users_list").find(".user_list_main").hide()
                $(".all_users_list").find(".user_list_skeleton").show()
                const req = await fetchtimeout("/control/users/all-users/", {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    setTimeout( () => {
                        $(".all_users_list").find(".user_list_main").remove()
                        $(".all_users_list").find(".user_list_skeleton").hide()
                        $(".all_users_list").append(res)
                        Snackbar.show({ 
                            text: `
                                <div class="flex justify-center items-center gap-2"> 
                                    <i style="font-size: 1.25rem; color: rgba(34, 197, 94, 1);" class="fad fa-info-circle"></i>
                                    <span>Users Fetched Successfully</span>
                                </div>
                            `, 
                            duration: 3000,
                            showAction: false
                        })
                    }, 500)
                } else {
                    throw new Error(e)
                }
            } catch (e) {
                Snackbar.show({
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                            <span>Failed Fetch all users</span>
                     </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }, 
        search_user: async (val) => {
            try {
                let data = new FormData() 
                data.append("search", val)
                $(".all_users_list").find(".user_list_skeleton").show()
                $(".all_users_list").find(".user_list_main").remove()
                const req = await fetchtimeout("/control/users/search-users/", {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text() 
                    search_user = false
                    setTimeout( () => {
                        $(".all_users_list").find(".user_list_skeleton").hide()
                        $(".all_users_list").append(res)
                    }, 500)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e){
                search_user = false
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
        sort_users: async (val) => {
            try {
                let data = new FormData() 
                data.append("sort", val)
                const req = await fetchtimeout("/control/users/sort-users/", {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok) {
                    const res = await req.text() 
                    sort_users = false
                    setTimeout( () => {
                        $(".all_users_list").find(".user_list_skeleton").hide()
                        $(".all_users_list").find(".user_list_main").remove()
                        $(".all_users_list").append(res)
                    }, 500)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                sort_users = false
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
        online: () => {
            return `<div class="absolute dark:bg-teal-700 h-4 w-4 rounded-full right-3"></div>`
        }, 
        offline: () => {
            return `<div class="absolute dark:bg-gray-500 h-4 w-4 rounded-full right-3"></div>`
        }, 
        info_menu: async (id, menu) => {
            try {
                let data = new FormData() 
                data.append("id", id) 
                const req = await fetchtimeout(`/control/users/${menu}/`, {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok) {
                    const res = await req.text() 
                    $(".user_info").find(".info_main_list").html(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                throw new Error(e)
            }
        }
    }
    //socket events 
    socket.on('user-disconnected', (data) => {
        if(data.id){
            $(`.user_list_main[data='${data.id}']`).find(".badge-status").html(Data.offline())
        }
    })
    socket.on('connected', (data) => {
        if(data.id){
            $(`.user_list_main[data='${data.id}']`).find(".badge-status").html(Data.online())
        }
    })
})