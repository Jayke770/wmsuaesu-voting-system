$(document).ready(() => {
    //sweetalert toast
    var toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    })
    const socket = io()
    //new user connected
    socket.on('new-user-logged', (data) => {
        //update user div class to online
        $("." + data.id).find('.badge').removeClass('badge_wait badge_offline')
        toast.fire({
            icon: 'info',
            title: 'New User Connected',
        })
        socket.emit('response-to-user', data.socket)
    })
    socket.on('new-user-logged-out', (data) => {
        //update user div class to offline
        $("." + data.id).find('.badge').removeClass('badge_wait')
        $("." + data.id).find('.badge').addClass('badge_offline')
        toast.fire({
            icon: 'warning',
            title: 'New User Disconnected',
        })
    })
    //if auto scroll is click 
    $(".forms").delegate(".log_scroll", "click", function () {
        if ($(this).attr("data") == "disabled") {
            $(this).attr("data", "enabled")
            $(this).addClass("focus")
        }
        else {
            $(this).attr("data", "disabled")
            $(this).removeClass("focus")
        }
    })
    //get election title 
    $(".other_e_name ").each(function(){
        setTimeout( () => {
            var html = $(this) 
            var str = html.html().split(" ")
            var text = ""
            for(var i = 0; i < str.length; i++){
                text = text + str[i].charAt(0).toUpperCase()
            }
            html.parent().parent().find(".icon_e_name").attr("src", avatar(text, color(), "transparent"))
        }, 2000)
    })
    $(".cnt_total_ac").each(function(){
        setTimeout( () => {
            var html = $(this)
            $.post('/active_voters', {
                id: html.attr("data-id")
            }, (res) => {
                html.html(res.active)
            })
        }, 2000)
    })
    if(location.hash == "#logs"){
        //read logs from server 
        setInterval(() => {
            socket.emit('logs', (log) => {
                $(".logs").html(log.log)
                if ($(".log_scroll").attr("data") == "enabled") {
                    scroll_div(".logs")
                }
            })
        }, 1000)
    }
    //check location hash
    if (!location.hash == "") {
        $(".loading_main").show(100)
        $(".close_nav").click()
        $.post(location.hash.replace("#", ""), async (res, status, xhr) => {
            if (status == 'success') {
                await $(".forms").html(res)
                $(".loading_main").hide(100)
            }
        })
    }
    //open nav
    $(".open_nav").click(function () {
        $(".nav").removeClass("animate__fadeOutLeft")
        $(".nav").show()
        $(".nav").addClass("animate__fadeInLeft")
        $(".nav").css("border-right", "1px solid var(--active_btn)")
    })
    $(".close_nav").click(function () {
        $(".nav").removeClass("animate__fadeInLeft")
        $(".nav").addClass("animate__fadeOutLeft")
        setTimeout(() => {
            $(".nav").removeAttr("style")
        }, 250)
    })
    //navigation
    $(".msg_open").click(() => {
        if($(".msg_main").css("display") != "none"){
            $(".msg_main").slideUp(200)
        }
        else{
            $(".msg_main").slideDown(200)
            $(".nty_main").hide()
        }
    })
    $(".nty_open").click(() => {
        if($(".nty_main").css("display") != "none"){
            $(".nty_main").slideUp(200)
        }
        else{
            $(".nty_main").slideDown(200)
            $(".msg_main").hide()
        }
    })
    //list btn click
    $(".list_btn").click(function () {
        if (!$(this).hasClass('ignore')) {
            $(".loading_main").show(100)
            $(".close_nav").click()
            location.hash = $(this).attr("data")
            $.post($(this).attr("data"), async (res, status, xhr) => {
                if (status == 'success') {
                    await $(".forms").html(res)
                    $(".loading_main").hide(100)
                }
            })
        }
    })
    $(".g_btn").click(function () {
        if (!$(this).hasClass("ignore")) {
            if ($(this).hasClass("g_btn_active")) {
                $(this).removeClass("g_btn_active")
                $(this).next().slideUp(250)

                //add style in g_btn_list 
                $(this).removeAttr("style")
            }
            else {
                //hide all open g_btn_list
                $(".g_btn_list").slideUp(250)
                $(".g_btn").removeAttr("style")
                //remove all active dropdown
                $(".g_btn").removeClass("g_btn_active")
                $(this).addClass("g_btn_active")
                $(this).next().slideDown(250)

                //add style in g_btn_list 
                $(this).css({
                    "border-bottom": "none",
                    "border-bottom-left-radius": "0",
                    "border-bottom-right-radius": "0"
                })
                $(this).next().css({
                    "border": "var(--dark_border)",
                    "border-top": "none",
                    "border-bottom-left-radius": "5px",
                    "border-bottom-right-radius": "5px"
                })
            }
        }
    })

    //main dash 
    $(".e_start").click(() => {
        toast.fire({
            position: 'center',
            showConfirmButton: true,
            toast: false,
            icon: 'success',
            title: 'Election Started!'
        })
    })
    $(".e_stop").click(() => {
        toast.fire({
            position: 'center',
            showConfirmButton: true,
            toast: false,
            icon: 'info',
            title: 'Election Terminated!'
        })
    })
    //view election room 
    $(".e_view_e_room").click(() => {
        setTimeout(() => {
            $(".e_room_blur").css("display", "flex")
        }, 250)
    })
    //close election room
    $(".cls_e_room").click(() => {
        $(".e_room").removeClass("animate__bounceInDown")
        $(".e_room").addClass("animate__bounceOutUp")
        setTimeout(() => {
            $(".e_room_blur").fadeOut(200)
            $(".e_room").addClass("animate__bounceInDown")
            $(".e_room").removeClass("animate__bounceOutUp")
        }, 500)
    })
    //show active voters 
    $(".e_ac").click(() => {
        setTimeout(() => {
            $(".active_e_voters").css("display", "flex")
        }, 250);
    })
    $(".cls_active").click(() => {
        $(".active_v_main").removeClass("animate__bounceIn")
        $(".active_v_main").addClass("animate__bounceOut")
        setTimeout(() => {
            $(".active_e_voters").fadeOut(100)
        }, 500)
        setTimeout(() => {
            $(".active_v_main").addClass("animate__bounceIn")
            $(".active_v_main").removeClass("animate__bounceOut")
        }, 1000)
    })
})