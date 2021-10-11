$(document).ready( function (){
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
    //tab 
    $(".tab_user_settings").click( function (e) {
        e.preventDefault() 
        const data = $(this).attr("data") 
        $(".tab_main").addClass("hidden")
        $(`.${data}`).removeClass("hidden")
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
    setTimeout( () => {
        Data.users()
    }, 1000)
    const Data = {
        users: async () => {
            try {
                const req = await fetchtimeout("/control/users/all-users/", {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    setTimeout( () => {
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