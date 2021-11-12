$(document).ready( () => {
    //open notification 
    $(".open_notification").click( () => {
        const nty = $(".notification")
        if(nty.hasClass("hidden")){
            nty.addClass(nty.attr("animate-in"))
            nty.removeClass("hidden")
            setTimeout( async () => {
                await notification.notifications()
                nty.removeClass(nty.attr("animate-in"))
            }, 500)
        } else {
            nty.addClass(nty.attr("animate-out"))
            setTimeout( () => {
                nty.removeClass(nty.attr("animate-out"))
                nty.addClass("hidden")
                $(".notifications_list").find(".notification_skeleton").removeClass("hidden")
                $(".notifications_list").find(".notification_skeleton").addClass("flex")
                $(".notifications_list").find(".notification").remove()
            }, 500)
        }
    })

    //remove notification 
    let remove_nty = false
    $(".notifications_list").delegate(".notification-data", "click", async function () {
        if(!remove_nty){
            Swal.fire({
                icon: 'question', 
                title: "Remove Notification", 
                html: "This process cannot be undone", 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                confirmButtonText: "Remove", 
                denyButtonText: "Cancel"
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Removing Notification', 
                        html: 'Please wait...', 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                remove_nty = true 
                                let data = new FormData() 
                                data.append("type", $(this).attr("type"))
                                data.append("id", $(this).attr("data"))
                                const req = await fetchtimeout("/account/notifications/remove/", {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    }, 
                                    body: data
                                })
                                if(req.ok){
                                    const res =await req.json()
                                    remove_nty = false 
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false, 
                                    }).then( () => {
                                        $(this).remove()
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                remove_nty = false 
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
    //websocket 
    socket.on('new_notification', async () => { 
        $(".open_notification").find(".dot").removeClass("hidden")
        sent()
        await notification.notifications()
        alertify.notify('New Notification')
    })
    let get_notifications = false
    const notification = {
        notifications: async () => {
            if(!get_notifications){
                try {
                    $(".notifications_list").find(".notification_skeleton").removeClass("hidden")
                    $(".notifications_list").find(".notification_skeleton").addClass("flex")
                    $(".notifications_list").find(".notification").remove()
                    get_notifications = true 
                    const req = await fetchtimeout('/account/notifications/', {
                        method: 'POST', 
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }
                    })
                    if(req.ok){
                        const res = await req.text() 
                        get_notifications = false
                        $(".notifications_list").find(".notification_skeleton").removeClass("flex")
                        $(".notifications_list").find(".notification_skeleton").addClass("hidden")
                        $(".notifications_list").append(res)
                    } else {
                        throw new Error(`${req.status} ${req.statusText}`)
                    }
                } catch (e) {
                    get_notifications = false 
                    notification.error(e.message)
                }
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