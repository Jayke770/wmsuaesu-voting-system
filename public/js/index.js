"use strict"
$(document).ready(() => {
    var wait, timer = null, typing = false
    var loc = location.hash.replace("#", "")
    const patuyok = '<i class="fa fa-spinner fa-spin"></i>'
    //set the default title 
    $("title").attr("default", $("title").text())
    //socket 
    const socket = io()
    socket.on('new-profile-comment', (data) => {
        if (data) {
            nty()
            alertify.message('New Profile Comment');
            new_cmt(data.data, data.name, data.time, 'nty', data.nty_id, data.read)
        }
    })
    socket.on('disconnect', function () {
        $(".conn").removeClass("connected")
        $(".conn").html('Reconnecting')
        $(".conn").fadeIn(100)
    });
    //when user is connect to server
    socket.on('connected', (data) => {
        $(".conn").addClass("connected")
        $(".conn").html(data.msg)
        setTimeout(() => {
            $(".conn").fadeOut(100)
        }, 500)
    })
    socket.on('new_candidate', (data) => {
        nty()
        alertify.message(data.data)
        new_nty(data.data + ', ' + data.name, data.time, data.userid, data.nty_id, data.read, data.type, data.type)
        //if location hash is = to candidates
        if (location.hash.replace("#", "") == "candidates") {
            candidates()
        }
    })
    //when election is started 
    socket.on('user-left-election', (data) => {
        nty()
        alertify.message('A Voter ' + data.data)
        new_nty(data.name + ', ' + data.data, data.time, data.useri, data.nty_id, data.read, 'sign-out-alt', 'sign-out-alt')
    })
    //when new user joined the election
    socket.on('new-user-joined-election', (data) => {
        nty()
        alertify.message('New Voter ' + data.data)
        new_nty(data.name + ', ' + data.data, data.time, data.userid, data.nty_id, data.read, data.type, data.type)
    })
    //new message 
    socket.on('new-message', (data) => {
        new_()
        alertify.message('New Message')
        receive_msg(data.msg)
    })
    socket.on('kachat-is-typing', () => {
        if ($(".create_msg").find(".tw").attr("text") != "") {
            $(".create_msg").find(".tw").fadeIn(500)
            $(".create_msg").find(".tw").attr("text", "Typing")
        }
    })
    socket.on('kachat-is-not-typing', () => {
        $(".create_msg").find(".tw").removeAttr("text")
        $(".create_msg").find(".tw").fadeOut(500)
    })
    //end of socket 

    //location hash checking
    if (loc == "home" || loc == "") {
        $(".e_t").show()
        $(".e_main").hide()
        $(".e_main").html("")
    } else if (loc == "file_candidacy") {
        file_candidacy(loc)
    } else if (loc == "candidates") {
        candidates()
    }
    //end of location hash checking

    //create letter avatar
    $(".e_title").each(function () {
        $(this).css("background", dark())
    })

    //join and leaving election
    $(".join_elec").click(() => {
        Swal.fire({
            title: 'Enter Election passcode',
            input: 'text',
            inputAttributes: {
                autocapitalize: 'off'
            },
            showCancelButton: true,
            confirmButtonText: 'Join',
            showLoaderOnConfirm: true,
            preConfirm: (code) => {
                return $.post('/join-election', {
                    code: code
                }, function (res) {
                    return res
                })
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed) {
                if (result.value.isvalid && !result.value.joined_before) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Successfully Joined'
                    }).then(async (res) => {
                        //notify other user that their is new user joined the election
                        await socket.emit('join-election', result.value.id)
                        window.location.reload(true)
                    })
                }
                else if (result.value.isvalid && result.value.joined_before) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Successfully Joined'
                    }).then((res) => {
                        window.location.reload(true)
                    })
                }
                else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Invalid Passcode'
                    })
                }
            }
        })
    })
    $(".leave_elec").click(() => {
        Swal.fire({
            title: 'Leave Election?',
            showCancelButton: true,
            cancelButtonText: 'No',
            confirmButtonColor: 'var(--red)',
            confirmButtonText: 'Yes',
            showLoaderOnConfirm: true,
            preConfirm: (none) => {
                return $.post('/leave-election', {
                    leave: 1
                }, function (res) {
                    return res
                })
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed) {
                if (result.value.isleave) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Successfully Left'
                    }).then((res) => {
                        socket.emit('leave-election', (res) => {
                            if (res.leave) {
                                window.location.href = ''
                            }
                        })
                    })
                }
                else if (result.value.isleave == null) {
                    Swal.fire({
                        icon: 'info',
                        title: 'You already left'
                    })
                }
                else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed to left'
                    })
                }
            }
        })
    })
    //end of join and leaving electon
    //connecting dot
    const tw2 = new Typewriter(".dot", {
        loop: true,
    });
    tw2.typeString('. . .')
        .pauseFor(4000)
        .changeCursor('-')
        .start();

    //open nav
    $(".open_nav").click(() => {
        var nty = $(".nty_main").hasClass("hidden"), msg = $(".msgs").hasClass("hidden")
        if (nty !== true) {
            $(".close_nty_").click()
            $(".nav").removeClass("hidden")
        }
        if (msg !== true) {
            $(".close_msg_").click()
            $(".nav").removeClass("hidden")
        }
        if (msg === true && nty === true) {
            $(".nav").removeClass("hidden")
        }
        setTimeout(() => {
            $(".nav").removeClass("animate__slideInLeft")
        }, 250)
    })
    $(".cls_nav").click(() => {
        $(".nav").addClass("animate__slideOutLeft")
        setTimeout(() => {
            $(".nav").addClass("hidden animate__slideInLeft")
            $(".nav").removeClass("animate__slideOutLeft")
        }, 250)
    })
    //open notifications
    $(".nty_nav_btn").click(function () {
        var nav = $(".nav").hasClass("hidden")
        if (nav) {
            $(".nty_main").removeClass("hidden animate__slideOutRight")
        }
        else {
            $(".cls_nav").click()
            $(".nty_main").removeClass("hidden animate__slideOutRight")
        }
    })
    $(".close_nty_").click(() => {
        $(".nty_main").addClass("animate__slideOutRight")
        $(".nty_main").removeClass("animate__slideInRight")
        setTimeout(() => {
            $(".nty_main").addClass("animate__slideInRight hidden")
        }, 250)
    })
    $(".close_msg_").click(() => {
        $(".msgs").addClass("animate__slideOutRight")
        $(".msgs").removeClass("animate__slideInRight")
        setTimeout(() => {
            $(".msgs").addClass("animate__slideInRight hidden")
        }, 250)
    })
    //open msg bitsin hahah
    $(".msg_ic").click(function () {
        var nav = $(".nav").hasClass("hidden")
        if (nav) {
            $(".msgs").removeClass("hidden animate__slideOutRight")
        }
        else {
            $(".cls_nav").click()
            $(".msgs").removeClass("hidden animate__slideOutRight")
        }
    })
    //if all e_btn is click
    $(".e_btn").click(function () {
        if ($(this).attr("data") != "") {
            const data = $(this).attr("data")
            if (data == 'file_candidacy') {
                toast.fire({
                    timer: 0,
                    title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i> Please Wait',
                })
                $("title").text("File for Candidacy")
                file_candidacy($(this).attr("data"))
                $(".cls_nav").click()
            } else if (data == 'home') {
                $(".e_t").show()
                $(".e_main").hide()
                $(".e_main").html("")
                $("title").text($("title").attr("default"))
                $(".cls_nav").click()
            } else if (data == 'candidates') {
                toast.fire({
                    timer: 0,
                    title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i> Please Wait',
                })
                $("title").text("Candidates")
                candidates()
                $(".cls_nav").click()
            }
        }
    })
    setInterval(() => {
        $(".time").each(function () {
            $(this).html(timeago.format($(this).attr("date-time"), 'custom'))
        })
    }, 1000)

    //when msg search icon is click 
    $(".ic_search_user").click(() => {
        $(".t_m").slideUp(250)
        $(".s").css("display", "flex")
        $(".search_user").focus()
        $(".msg_main").slideUp(300)
    })
    $(".ic_back").click(() => {
        $(".t_m").slideDown(250)
        $(".s").css("display", "none")
        $(".user_msg_search").html("")
        $(".search_user").val('')
        $(".msg_main").slideDown(300)
    })
    //message 
    const msg_tw = new Typewriter(".msg_s_loading", {
        loop: true,
    })
    msg_tw.typeString($(".msg_s_loading").attr("text"))
        .pauseFor(500)
        .deleteAll()
        .typeString('Please Wait . . .')
        .changeCursor('*')
        .pauseFor(1000)
        .deleteAll()
        .changeCursor(':')
        .start()
    $(".search_user").keyup(function () {
        if ($(this).val() != "") {
            $(".user_msg_search").fadeIn(500)
            $.post('/search-user', {
                data: $(this).val()
            }, (res) => {
                $(".user_msg_search").html("")
                $(".user_msg_search").html(res)
            })
        }
    })
    //chat user 
    $(".user_msg_search").delegate(".chat_user", "click", function (e) {
        e.preventDefault()
        $.post('/chat-user', {
            data: $(this).attr("data-id")
        }, (res) => {
            if (!res.ischat) {
                $(".msg_msg").html('')
                $(".msg_msg").html(res)
                $(".float_messenger").show()
                setTimeout(() => {
                    $(".float_messenger").removeClass("animate__animated animate__slideInRight")
                    $(".msg_ic").click()
                }, 400)
                setTimeout(() => {
                    chats()
                }, 500)
            }
        })
    })
    $("body").delegate(".chat_user", "click", function (e) {
        e.preventDefault()
        $.post('/chat-user', {
            data: $(this).attr("data-id")
        }, (res) => {
            if (!res.ischat) {
                $(".msg_msg").html('')
                $(".msg_msg").html(res)
                $(".float_messenger").show()
                setTimeout(() => {
                    $(".float_messenger").removeClass("animate__animated animate__slideInRight")
                }, 400)
                setTimeout(() => {
                    chats()
                }, 500)
            }
        })
    })
    //when messenger header is click 
    //send chat 
    $(".msg_msg").delegate(".send_chat_msg", "click", function (e) {
        e.preventDefault()
        var msg = $(".chat_msg_data").val().trim()
        if (!msg) {
            msg = '❤️'
        }
        $(".send_chat_msg").removeClass("fa fa-paper-plane")
        $(".send_chat_msg").html(patuyok)
        $.post('/chat-id', (res) => {
            if (res.valid) {
                const data = {
                    id: res.id,
                    msg: msg
                }
                socket.emit('send-chat', data, (status) => {
                    if (status.sent) {
                        $(".chat_msg_data").val('')
                        $(".send_chat_msg").html('')
                        $(".send_chat_msg").addClass("fa fa-paper-plane")
                        sent()
                        $(".no_chats").remove()
                        sent_msg(status.msg.msg)
                    }
                    else {
                        toast.fire({
                            icon: 'error',
                            title: 'Failed to sent'
                        })
                        $(".chat_msg_data").val('')
                        $(".send_chat_msg").html('')
                        $(".send_chat_msg").addClass("fa fa-paper-plane")
                    }
                })
            }
        })
    })
    //typing status 
    $(".msg_msg").delegate(".chat_msg_data", "keyup", function () {
        if (!typing) {
            socket.emit('typing', $(".float_messenger").attr("data-id"))
        }
    })
    $(".msg_msg").delegate(".chat_msg_data", "keydown", function () {
        clearTimeout(timer);
        timer = setTimeout(not_typing, 1000)
    })
    function not_typing() {
        typing = false
        socket.emit('not-typing', $(".float_messenger").attr("data-id"))
    }
    //profile 
    $(".bio_add").click(() => {
        $(".bio").addClass("animate__slideInDown")
        $(".bio").removeClass("animate__slideOutUp")
        $(".add_bio").css("display", "grid")
    })
    $(".cls_bio").click(() => {
        $(".bio").removeClass("animate__slideInDown")
        $(".bio").addClass("animate__slideOutUp")
        setTimeout(() => {
            $(".add_bio").hide(300)
        }, 200)
    })
    $(".form_bio").submit(function (e) {
        e.preventDefault()
        $.ajax({
            url: '/change-bio',
            method: 'POST',
            processData: false,
            contentType: false,
            cache: false,
            data: new FormData(this),
            beforeSend: () => {
                $(this).find(".wmsu_btn").html(patuyok)
            },
            success: (res) => {
                if (res.ok) {
                    $(this).find(".wmsu_btn").html("Save")
                    $(this).find('input[type=reset]').click()
                    $(".cls_bio").click()
                    toast.fire({
                        icon: 'success',
                        position: 'center',
                        toast: false,
                        showConfirmButton: true,
                        title: res.msg
                    })
                }
                else {
                    toast.fire({
                        icon: 'error',
                        position: 'center',
                        toast: false,
                        showConfirmButton: true,
                        title: res.msg
                    })
                }
            }
        })
    })
    $(".send_cmt").click(function () {
        const send = $(this)
        const cmt = $(".cmt_msg_").val()
        if (cmt.trim() != "") {
            send.find('i').addClass("fa-spin fa-spinner")
            send.find('i').removeClass("fa-paper-plane")
            $.post("/profile-comment", {
                cmt: cmt
            }, (status) => {
                if (status.send) {
                    send.find('i').addClass("fa-paper-plane")
                    send.find('i').removeClass("fa-spin fa-spinner")
                    $(".cmt_msg_").val("")
                    sent()
                    socket.emit('profile-comment', { cmt }, (res) => {
                        new_cmt(res.data.cmt, res.data.name, res.data.time, 'sent')
                    })
                } else {
                    send.find('i').addClass("fa-times")
                    send.find('i').removeClass("fa-spin fa-spinner")
                }
            })
        }
    })

    //file candidacy 
    $(".e_main").delegate(".fl_c", "submit", function (e) {
        e.preventDefault()
        if (!wait) {
            wait = true
            toast.fire({
                timer: 0,
                title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i>Please Wait',
            })
            $.ajax({
                url: '/file-candidacy',
                method: 'POST',
                cache: false,
                contentType: false,
                processData: false,
                data: new FormData(this),
                success: (res) => {
                    if (res.iscreated) {
                        toast.fire({
                            icon: 'success',
                            title: res.msg,
                        }).then(() => {
                            socket.emit('file-candidacy')
                            wait = false
                        })
                        $(this).find('input[type="reset"]').click()
                    } else {
                        toast.fire({
                            icon: 'error',
                            title: res.msg,
                        })
                        wait = false
                    }
                },
            })
        }
    })

    //functions 
    //for new comment
    function new_cmt(comment, name, time, type, nty_id, read) {
        const div_cmt = $("body").find(".cmts")
        const new_cmt = `
            <div class="data_cmt">
                <div class="data_c">
                <img class="cmt_img" src="/assets/logo.png">
                    <div class="msg_cmt">
                        <span class="name">` + name + `</span>
                            <div class="cmt_msg">` + comment + `</div>
                    </div>
                </div>
                <div class="o">
                    <span class="time" date-time=` + time + `></span>
                </div>
            </div>
        `
        const new_nty = `
            <a class="open_cmt" style="text-decoration: none;" href='?view_comment=`+ nty_id + `&read=` + read + `'>
                <div class="nty_data">
                    <table>
                        <tr>
                            <td width="10px" class="ic">
                                <i class="n_ic n_cmt fa fa-comment-dots"></i>
                            </td>
                            <td class="nty_cnt">
                                ` + name + ' Commented on your profile ' + `
                            </td>
                            <td>
                                <p class="time" date-time=` + time + `></p>
                            </td>
                        </tr>
                    </table>
                </div>
            </a>
        `
        if (div_cmt.length != 0) {
            //if the user commented on thier own profile
            if (div_cmt.attr("profile") == "true" && type == "sent" || div_cmt.attr("profile") == "true" && type == "nty") {
                $(".cmts").append(new_cmt)
                $(".cmts").animate({ scrollTop: $(".cmts")[0].scrollHeight }, 1000);
            }
            //if the user commented on other profile
            if (div_cmt.attr("profile") == "false" && type == "sent") {
                $(".cmts").append(new_cmt)
                $(".cmts").animate({ scrollTop: $(".cmts")[0].scrollHeight }, 1000);
            }
        }
        //append to notifications 
        if (type == 'nty') {
            $(".nty").prepend(new_nty)
            $(".nav_nty_cnt").show()
        }
        //display total comments 
        const cmt = parseInt($(".cnt_cmt").attr('count'))
        $(".cnt_cmt").attr('count', cmt + 1)
        $(".cnt_cmt").html(cmt + 1)
    }
    //new user joined the election 
    //for new candidate
    function new_nty(cnt, time, userid, nty_id, read, icon, cls) {
        const new_nty = `
            <a style="text-decoration: none;" href="/home/profile/?id=`+ userid + `&notification_id=` + nty_id + `&read=` + read + `">
                <div class="nty_data">
                    <table>
                        <tr>
                            <td width="10px" class="ic">
                                <i class="n_ic n_`+ cls + ` fa fa-` + icon + `"></i>
                            </td>
                            <td class="nty_cnt">
                                ` + cnt + `
                            </td>
                            <td>
                                <p class="time" date-time=` + time + `></p>
                            </td>
                        </tr>
                    </table>
                </div>
            </a>
        `
        //append to notifications 
        $(".nty").prepend(new_nty)
        $(".nav_nty_cnt").show()
    }

    function file_candidacy(data) {
        $.post('/election-info', {
            type: data
        }, (res) => {
            if (res != "") {
                toast.fire({
                    icon: 'success',
                    title: 'Data Loaded',
                })
                $(".e_t").hide()
                $(".e_main").show()
                $(".e_main").html(res)
            } else {
                toast.fire({
                    icon: 'error',
                    title: 'An error occured',
                })
            }
        })
    }

    function candidates() {
        $.post("/candidates", (res) => {
            if (res != "") {
                toast.fire({
                    icon: 'success',
                    title: 'Data Loaded',
                })
                $(".e_t").hide()
                $(".e_main").show()
                $(".e_main").html(res)
            } else {
                toast.fire({
                    icon: 'error',
                    title: 'An error occured',
                })
            }
        })
    }
    function sent_msg(msg) {
        var div_sent = `<div class="chat_sent">
                            <div class="sent_msg">`+ msg.replace('<', '<a><</a>').replace('>', '<a>></a>') + `</div>
                        </div>`
        scroll_div(".chats")
        $(".chats").append(div_sent)
    }
    function receive_msg(msg) {
        var div_r = `<div class="chat_received">
                            <div class="received_msg">`+ msg.replace('<', '<a><</a>').replace('>', '<a>></a>') + `</div>
                        </div>`
        scroll_div(".chats")
        $(".chats").append(div_r)
        $(".no_chats").remove()
    }
    function chats() {
        $.post('/chats', (res) => {
            if (!res.ischat) {
                $(".chat_msg_data").focus()
                setTimeout(() => {
                    $(".chats").html(" ")
                    $(".chats").html(res)
                    scroll_div(".chats")
                }, 500)
            }
        })
    }
})