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