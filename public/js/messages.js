$(document).ready( () => {
    //open messages 
    $(".open_message").click( () => {
        const nty = $(".notification") 
        const msg = $(".messages") 

        if(nty.hasClass("hidden") && msg.hasClass("hidden")) {
            msg.addClass(msg.attr("animate-in"))
            msg.removeClass("hidden")
            setTimeout( async () => {
                msg.removeClass(msg.attr("animate-in"))
                await message.messages()
            }, 300)
        } else if(nty.hasClass("hidden") && !msg.hasClass("hidden")){
            msg.addClass(msg.attr("animate-out"))
            setTimeout( () => {
                msg.addClass("hidden")
                msg.removeClass(msg.attr("animate-out"))
                $(".messages_list").find(".message_skeleton").removeClass("hidden")
                $(".messages_list").find(".message_skeleton").addClass("flex")
                $(".messages_list").find(".message").remove()
            }, 300)
        } else {
            msg.addClass(msg.attr("animate-in"))
            msg.removeClass("hidden")

            nty.addClass(nty.attr("animate-out"))
            setTimeout( async () => {
                msg.removeClass(msg.attr("animate-in"))
                nty.removeClass(nty.attr("animate-out"))
                nty.addClass("hidden")
                $(".notifications_list").find(".notification_skeleton").removeClass("hidden")
                $(".notifications_list").find(".notification_skeleton").addClass("flex")
                $(".notifications_list").find(".notification").remove() 
                await message.messages()
            }, 500)
        }
    })

    //search user 
    let search = false
    $(".search_user").keyup( async function () {
        if($(this).val() !== ""){
            if(!search){
                try {
                    search = true 
                    let data = new FormData() 
                    data.append("search", $(this).val())
                    $(".messages_list").find(".message_skeleton").removeClass("hidden")
                    $(".messages_list").find(".message_skeleton").addClass("flex")
                    $(".messages_list").find(".message_user, .message").remove()
                    const req = await fetchtimeout('/account/messages/search-users/', {
                        method: 'POST', 
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }, 
                        body: data
                    })
                    if(req.ok){
                        const res = await req.text() 
                        search = false
                        $(".messages_list").find(".message_skeleton").removeClass("flex")
                        $(".messages_list").find(".message_skeleton").addClass("hidden")
                        $(".messages_list").append(res)
                    } else {
                        throw new Error(`${req.status} ${req.statusText}`)
                    }
                } catch (e) {
                    search = false 
                    message.error(e.message)
                }
            }
        } else {
            await message.messages()
        }
    })
    //when the user click the fetch users in search results 
    let begin_chat = false
    $(".messages_list").delegate(".message_user, .message", "click", async function () {
        if(!begin_chat){
            Swal.fire({
                icon: 'info', 
                title: `Connecting to ${$(this).attr("name") ? $(this).attr("name") : 'User'}`, 
                html: 'Please wait...', 
                backdrop: true, 
                allowOutsideClick: false, 
                showConfirmButton: false, 
                willOpen: async () => {
                    Swal.showLoading()
                    try {
                        begin_chat = true 
                        let data = new FormData() 
                        data.append("id", $(this).attr("data"))
                        const req = await fetchtimeout("/account/messages/begin-chat/", {
                            method: 'POST', 
                            headers: {
                                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                            }, 
                            body: data
                        })
                        if(req.ok){
                            const res = await req.text() 
                            const msg = $(".messages") 
                            msg.addClass(msg.attr("animate-out"))
                            setTimeout( () => {
                                msg.addClass("hidden")
                                msg.removeClass(msg.attr("animate-out"))
                                $(".messages_list").find(".message_skeleton").removeClass("hidden")
                                $(".messages_list").find(".message_skeleton").addClass("flex")
                                $(".messages_list").find(".message").remove()
                                $("body").find(".conversation").remove()
                                $("body").append(res)
                                Swal.close()
                                begin_chat = false
                            }, 300)
                        } else {
                            throw new Error(`${req.status} ${req.statusText}`)
                        }
                    } catch (e) {
                        begin_chat = false 
                        Swal.fire({
                            icon: 'error', 
                            title: `Connection error`, 
                            html: e.message, 
                            backdrop: true, 
                            allowOutsideClick: false, 
                        })
                    }
                }
            })
        }
    })

    let get_messages = false
    const message = {
        messages: async () => {
            if(!get_messages){
                try {
                    $(".messages_list").find(".message_skeleton").removeClass("hidden")
                    $(".messages_list").find(".message_skeleton").addClass("flex")
                    $(".messages_list").find(".message_user, .message").remove()
                    get_messages = true 
                    const req = await fetchtimeout('/account/messages/', {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                        }
                    })
                    if(req.ok) {
                        const res = await req.text() 
                        get_messages = false
                        $(".messages_list").find(".message_skeleton").removeClass("flex")
                        $(".messages_list").find(".message_skeleton").addClass("hidden")
                        $(".messages_list").append(res)
                    } else {
                        throw new Error(`${req.status} ${req.statusText}`)
                    }
                } catch (e) {
                    get_messages = false 
                    message.error(e.message)
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