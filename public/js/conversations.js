$(document).ready(() => {
    $("body").delegate(".conversation_header", "click", async function () {
        if ($(".conversation_main").hasClass("flex")) {
            $(".conversation_main").addClass("hidden")
            $(".conversation_main").removeClass("flex")
            $(".conversation").animate({
                height: "61px"
            }, 250)
        } else {
            $(".conversation_main").addClass("flex")
            $(".conversation_main").removeClass("hidden")
            $(".conversation").animate({
                height: "83.333333%"
            }, 250)
            await conversation.conversations()
        }
    })

    //send message
    let send_msg = false
    $("body").delegate(".send_message", "click", async function () { 
        const def = $(this).html()
        const msg = $(".conversation").find(".message-content").text()
        if(!send_msg && msg){
            $(this).html(conversation.loader())
            socket.emit('send-message', {message: msg, kachatid: $(".conversation").attr("data")}, (res) => {
                if(res.status) {
                    socket.emit('not-typing', {kachatid: $(".conversation").attr("data")})
                    typing = false
                    $(this).html(def)
                    $(".conversation").find(".message-content").html('') 
                    conversation.sent(res.message)
                } else {
                    $(this).html(def)
                    conversation.error("Failed to sent")
                }
            })
        }
    })
    $("body").delegate(".message-content", "click" ,() => {
        scroll_div(".conversations_main_list")
    })

    //close messenger 
    let close_chat = false
    $("body").delegate(".close-kachat", "click", async () => {
        if(!close_chat){
            try {
                close_chat = true 
                const req = await fetchtimeout('/account/message/close/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok) {
                    const res = await req.json() 
                    if(res.status){
                        close_chat = false
                        $("body").find(".conversation").remove()
                    }
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                close_chat = false
                conversation.error(e.message)
            }
        }
    })
    //typing status 
    let typing = false
    $("body").delegate(".message-content", "keyup", function () {
        if(!typing){
            typing = true
            socket.emit('typing', {kachatid: $(".conversation").attr("data")})
        }
    })

    //receive new message 
    socket.on('new-message', (data) => {
        if($(".conversation").length > 0){
            conversation.recieve(data)
        }
    })
    //typing  status
    socket.on('typing', () => {
        conversation.typing()
    })
    socket.on('not-typing', () => {
        typing = false
        conversation.nottyping()
    })

    //ka chat disconnected 
    socket.on('kachat-disconnect', () => {
        console.log('dis')
        $(".conversation").find(".chat-status").find(".user-chat-status").remove() 
        $(".conversation").find(".chat-status").append(`<span class="user-chat-status dark:text-gray-500 text-xs">Offline</span>`)
    })

    //ka chat reconnected 
    socket.on('kachat-reconnect', () => {
        $(".conversation").find(".chat-status").find(".user-chat-status").remove() 
        $(".conversation").find(".chat-status").append(`<span class="user-chat-status dark:text-teal-600 text-xs">Online</span>`)
    })
    const conversation = {
        conversations: async () => {
            try {
                $("body").find(".conversations_main_list_skeleton").addClass("flex")
                $("body").find(".conversations_main_list_skeleton").removeClass("hidden")
                $("body").find(".conversations_main_list_msg").remove()
                const req = await fetchtimeout('/account/messages/list/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if (req.ok) {
                    const res = await req.text()
                    setTimeout(() => {
                        $("body").find(".conversations_main_list_skeleton").addClass("hidden")
                        $("body").find(".conversations_main_list_skeleton").removeClass("flex")
                        $("body").find(".conversations_main_list").append(res)
                        scroll_div(".conversations_main_list", 100)
                    }, 500)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                $("body").find(".conversation").remove()
                conversation.error(e.message)
            }
        },
        sent: (data) => {
            $("body").find(".conversations_main_list").append(`
                <div style="animation-delay: .250s;" class="conversations_main_list_msg animate__animated animate__fadeInUp ms-500 sent flex w-full justify-end">
                    <div class="dark:bg-indigo-900 shadow-md text-sm max-w-[75%] rounded-md px-2 py-1.5 break-words dark:text-gray-300">${data.message}</div>
                </div>
            `)
            $("body").find('.msg-none').remove()
            scroll_div(".conversations_main_list")
        },
        recieve: (data) => {
            $("body").find(".conversations_main_list").append(`
                <div style="animation-delay: .250s;" class="conversations_main_list_msg animate__animated animate__fadeInUp ms-500 flex w-full justify-start">
                    <div class="dark:bg-darkBlue-100 shadow-md text-sm max-w-[75%] rounded-md px-2 py-1.5 break-words dark:text-gray-300">${data.message}</div>
                </div>
            `)
            $("body").find('.msg-none').remove()
            scroll_div(".conversations_main_list")
        },
        typing: () => {
            $("body").find(".typing-msg").remove()
            $("body").find(".conversations_main_list").append(`
                <div class="conversations_main_list_msg animate__animated animate__fadeInUp ms-500 typing-msg flex w-full justify-start">
                    <div class="dark:bg-darkBlue-100 shadow-md text-sm max-w-[75%] rounded-md px-2 py-1.5 break-words dark:text-gray-300">Typing...</div>
                </div>
            `)
            scroll_div(".conversations_main_list")
        },
        nottyping: () => {
            $("body").find(".typing-msg").remove()
            scroll_div(".conversations_main_list")
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