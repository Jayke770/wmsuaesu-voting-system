$(document).ready(() => {
    setTimeout( () => {
        $(".elections").find(".icon_e_name").each( function() {
            $(this).removeClass("skeleton-image")
            $(this).attr("src", avatar($(this).attr("data"), "#fff", dark()) )
        })
    }, 1000)
    //open nav
    $(".open_nav").click( () => {
        const parent = $(".nav_")
        const child = $(".nav_main")
        $(".menu_small").hide()
        child.addClass(child.attr("animate-in"))
        parent.removeClass("hidden")
        parent.addClass("flex")
        setTimeout( () => {
            child.removeClass(child.attr("animate-in"))
        }, 300)
    })
    //close nav
    $(".close_nav").click( () => {
        const parent = $(".nav_")
        const child = $(".nav_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            parent.removeClass("flex")
            parent.addClass("hidden")
            child.removeClass(child.attr("animate-out"))
        }, 300)
    })
    $(".nav_").click( function (e) {
        if($(e.target).hasClass("nav_")){
            const parent = $(".nav_")
            const child = $(".nav_main")
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                parent.removeClass("flex")
                parent.addClass("hidden")
                child.removeClass(child.attr("animate-out"))
            }, 300)
        }
    })
    //open menu 
    $(".open_menu_small").click( () => {
        if($(".menu_small").css("display") ==="none"){
            $(".menu_small").show()
        } else {
            $(".menu_small").hide()
        }
    })
    $(".menu_small").mouseleave( function(){
        $(this).hide()
    })
    //get all elections in every 10 seconds 
    setInterval( () => {
        socket.emit('elections', async (res) => {
            if(parseInt($("html").attr("elections")) !== res.elections){
                $("html").attr("elections", res.elections)
                await election.elections()
            }
        })
    }, 1000)
    //open logs 
    $(".open_logs").click( () => {
        const parent = $(".logs")
        const child = $(".logs_main") 
        child.addClass(child.attr("animate-in")) 
        parent.removeClass("hidden")
        parent.addClass("flex")
        setTimeout( () => {
            child.removeClass(child.attr("animate-in"))
            scroll_div(".logs_main_list")
        }, 500)
    })
    //close logs 
    $(".logs").click( function (e) {
        if($(e.target).hasClass("logs")){
            e.preventDefault() 
            const parent = $(".logs")
            const child = $(".logs_main") 
            child.addClass(child.attr("animate-out"))  
            setTimeout( () => {
                child.removeClass(child.attr("animate-out"))
                parent.removeClass("flex")
                parent.addClass("hidden")
                scroll_div(".logs_main_list")
            }, 500)
        }
    })
    //receive server logs 
    socket.on('logs', (data) => {
        $(".logs").find(".logs_main_list").html('')
        $(".logs").find(".logs_main_list").append(data.logs)
        scroll_div(".logs_main_list")
    })
    //open notifications 
    $(".open_nty").click( () => {
        const parent = $(".notifications") 
        const child = $(".notifications_main")
        child.addClass(child.attr("animate-in"))
        parent.addClass("flex")
        parent.removeClass("hidden")
        setTimeout( async () => {
            child.removeClass(child.attr("animate-in"))
            await notification.notifications()
        }, 500)
    })
    //close notifications 
    $(".notifications").click( function (e) {
        if($(e.target).hasClass("notifications")){
            e.preventDefault() 
            const parent = $(".notifications") 
            const child = $(".notifications_main") 
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                child.removeClass(child.attr("animate-out"))
                parent.addClass("hidden")
                parent.removeClass("flex")
            }, 500)
        }
    })
    //open settings 
    $(".open_settings").click( () => {
        const parent = $(".settings") 
        const child = $(".settings_main")
        child.addClass(child.attr("animate-in"))
        parent.addClass("flex")
        parent.removeClass("hidden")
        setTimeout( async () => {
            child.removeClass(child.attr("animate-in"))
        }, 500)
    })
    //close settings 
    $(".settings").click( function (e) {
        if($(e.target).hasClass("settings")){
            e.preventDefault() 
            const parent = $(".settings") 
            const child = $(".settings_main") 
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                child.removeClass(child.attr("animate-out"))
                parent.addClass("hidden")
                parent.removeClass("flex")
            }, 500)
        }
    })
    //get server informaton 
    setInterval( () => {
        socket.emit('server-info', (res) => {
            $(".settings").find(".os").html(res.os)
            $(".settings").find(".cpu").html(res.cpu)
            $(".settings").find(".memory").html(res.memory)
            $(".settings").find(".storage").html(res.storage)
        })
    }, 1000)

    //update school year
    let update_sy = false
    $(".update_sy").click( () => {
        if(!update_sy){
            Swal.fire({
                icon: 'question', 
                title: 'Update School Year', 
                html: 'Are you sure you want to update the current school year', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                denyButtonText: "No", 
                confirmButtonText: "Yes", 
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'question', 
                        title: 'Enter New School Year', 
                        input: "text", 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showDenyButton: true, 
                        denyButtonText: "Cancel", 
                        confirmButtonText: "Update", 
                        inputValidator: (val) => {
                            if(val && Number.isInteger(parseInt(val)) && val.length === 4) {
                                Swal.fire({
                                    icon: 'info', 
                                    title: 'Updating School Year', 
                                    html: 'Please wait...', 
                                    backdrop: true, 
                                    allowOutsideClick: false, 
                                    showConfirmButton: false, 
                                    willOpen: async () => {
                                        Swal.showLoading() 
                                        try {
                                            update_sy = true 
                                            let data = new FormData() 
                                            data.append("sy", val)
                                            const req = await fetchtimeout('/control/sy/update/', {
                                                method: 'POST', 
                                                headers: {
                                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr("content")
                                                }, 
                                                body: data
                                            })
                                            if(req.ok){
                                                const res = await req.json() 
                                                update_sy = false
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
                                            update_sy = false
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
                            } else {
                                return 'Invalid Year'
                            }
                        }
                    })
                }
            })
        }
    })

    //wipe system data 
    let wipe = false
    $(".wipe_system").click( () => {
        if(!wipe){
            Swal.fire({
                icon: 'warning', 
                title: 'Wipe System Data', 
                html: 'This will wipe all the system data including all the elections, users, and other data stored in database', 
                backdrop: true, 
                allowOutsideClick: false, 
                denyButtonText: "Cancel", 
                showDenyButton: true,
                confirmButtonText: "Wipe", 
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Wiping System Data', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                wipe = true 
                                const req = await fetchtimeout('/control/wipe/', {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr("content")
                                    }
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    wipe = false
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false,
                                    }).then( () => {
                                        if(res.status){
                                            window.location.reload()
                                        }
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                wipe = false
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
    //election functions 
    setTimeout( () => {
        election.elections()
    }, 1000)
    const election = {
        elections: async () => {
            try {
                const req = await fetchtimeout('/control/elections/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".elections").html(res)
                } else {    
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgba(34, 197, 94, 1);" class="fad fa-info-circle"></i>
                            <span>Connection Error</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }
    }
    const notification = {
        notifications: async () => {
            try {
                $(".notifications").find(".notifications_main_list_skeleton").addClass("flex")
                $(".notifications").find(".notifications_main_list_skeleton").removeClass("hidden")
                $(".notifications").find(".notification").remove()
                const req = await fetchtimeout('/control/notifications/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text()
                    $(".notifications").find(".notifications_main_list_skeleton").addClass("hidden")
                    $(".notifications").find(".notifications_main_list_skeleton").removeClass("flex")
                    $(".notifications").find(".notifications_main_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                notification.error(e.message)
            }
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