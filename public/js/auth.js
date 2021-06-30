$(document).ready(function () {
    var theme = localStorage.getItem('theme') 
    if(theme != null){
        $(".dark_mode").prop("checked", true )
        $("html").addClass("dark")
    }
    $(".dark_mode").change(function(){
        var prop = $(this).prop("checked") 
        if(prop){
            $("html").addClass("dark")
            localStorage.setItem('theme', "dark") 
        }
        else{
            $("html").removeClass("dark")
            localStorage.removeItem('theme')
        }
    })
    /*left*/
    // const tw = new Typewriter(".txt1", {
    //     loop: false,
    // });
    // const tw2 = new Typewriter(".txt2", {
    //     loop: true,
    // });
    // tw.typeString('WMSU-AESU')
    //     .pauseFor(4000)
    //     .changeCursor(' ')
    //     .start();
    // tw2.typeString('Online Voting System')
    //     .pauseFor(8000)
    //     .deleteAll()
    //     .changeCursor('*')
    //     .typeString('100% Fast & Secure')
    //     .pauseFor(5000)
    //     .deleteAll()
    //     .changeCursor('+')
    //     .typeString('Realtime Votes Counter')
    //     .pauseFor(5000)
    //     .start();


    //login
    $(".auth_login").submit(function (e) {
        e.preventDefault();
        toast.fire({
            timer: 0,
            title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i>Please Wait',
        })
        $.ajax({
            url: '/login',
            method: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            data: new FormData(this),
            success: function (res_log) {
                if (res_log.islogin) {
                    toast.fire({
                        icon: 'success',
                        title: res_log.msg,
                    }).then((next) => {
                        window.location.reload(true)
                    })
                } else {
                    toast.fire({
                        icon: 'error',
                        title: res_log.msg,
                    })
                    setTimeout(function () {
                        $(".login").removeClass("d_err");
                    }, 500);
                }
            },
        });
    });
    //effects
    $(".auth_pass").on("keyup keydown", function () {
        if ($(this).val() !== "") {
             $(".show_pass").removeClass("hidden")
        }
        else {
            $(".show_pass").addClass("hidden")
        }
    })
    //show pass
    $(".show_pass").click(function () {
        var input = $('input[show-pass=true]')
        if(input.attr("type") == "password"){
            input.attr("type", "text")
            $(".show_pass").removeClass("fa-eye")
            $(".show_pass").addClass("fa-eye-slash")
        }
        else{
            input.attr("type", "password")
            $(".show_pass").addClass("fa-eye")
            $(".show_pass").removeClass("fa-eye-slash")
        }
    })
    $(".auth_usr, .auth_pass").focusin(function () {
        $(this).parent('.wmsu_inpt').addClass(" focus");
    });
    $(".auth_usr, .auth_pass").focusout(function () {
        $(this).parent('.wmsu_inpt').removeClass(" focus");
    });
    //verify student id
    $(".get_id").submit(function (e) {
        e.preventDefault()
        const form = $(this);
        form.find('.ic').removeClass("fa-arrow-right fa-times");
        form.find('.ic').addClass("fa-spinner fa-spin");
        form.find('.submit_id').removeClass("wmsu_err shake_right");
        toast.fire({
            timer: 0,
            title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i>Please Wait',
        })
        $.post('/verify', {
            id: $(".st_id").val()
        }, function (res) {
            if (res.isvalid == true) {
                $(".my_student_id").val(res.id)
                $(".student_id").text($('.student_id').text() + res.id)
                form.find('.ic').removeClass("fa-spinner fa-spin ");
                form.find('.ic').addClass("fa-check");
                form.find('.submit_id').addClass("wmsu_active");
                toast.fire({
                    icon: 'success',
                    title: res.msg,
                })
                setTimeout(function () {
                    $(".verify").hide(100);
                    $(".register_s").slideDown(250);
                }, 400);
            } else if (res.isvalid == false) {
                $(".box_reg").addClass("animate__animated animate__shakeX");
                form.find('.wmsu_inpt').addClass("err_focus");
                form.find('.submit_id').addClass("wmsu_err shake_right");
                form.find('.ic').removeClass("fa-spinner fa-spin ");
                form.find('.ic').addClass("fa-times");
                toast.fire({
                    icon: 'info',
                    title: res.msg
                })
                setTimeout(function () {
                    form.find('.submit_id').removeClass("shake_right");
                    $(".box_reg").removeClass("animate__animated animate__shakeX");
                }, 500);
            } 
            else{
                $(".box_reg").addClass("animate__animated animate__shakeX");
                form.find('.wmsu_inpt').addClass("err_focus");
                form.find('.submit_id').addClass("wmsu_err shake_right");
                form.find('.ic').removeClass("fa-spinner fa-spin ");
                form.find('.ic').addClass("fa-times");
                toast.fire({
                    icon: 'error',
                    title: res.msg
                })
                setTimeout(function () {
                    form.find('.submit_id').removeClass("shake_right");
                    $(".box_reg").removeClass("animate__animated animate__shakeX");
                }, 500);
            }
            
        });
    });
    //register 

    //show password
    $(".show_pass").click(function () {
        if ($(this).hasClass("visible")) {
            $(this).removeClass("visible fa-eye-slash");
            $(this).addClass("fa-eye")
            $(this).prev().attr("type", "password");
        } else {
            $(this).removeClass("fa-eye");
            $(this).addClass("visible fa-eye-slash");
            $(this).prev().attr("type", "text");
        }
    });
    //check the student id feild if empty 
    setInterval(function () {
        if ($(".st_id").val().length == 0) {
            $(".get_id").find('.submit_id').removeClass("wmsu_err");
            $(".get_id").find('.ic').removeClass("fa-times");
            $(".get_id").find('.ic').addClass("fa-arrow-right");
        }
    }, 200);
    //register button  green 
    $(".register").click(function () { //open reg form an close login form
        $(".login").slideUp(250);
        $(".box_reg").slideDown(250);
    });
    $(".close_reg_box").click(function () { //open login form and close reg form
        $(".box_reg").slideUp(250);
        $(".login").slideDown(250);
    });

    //register form 
    $(".next_cred").click(function () {
        const btn = $(this);
        var fname = $('input[name="fname"]'),
            mname = $('input[name="mname"]'),
            lname = $('input[name="lname"]'),
            course = $('select[name="course"]'),
            yr = $('select[name="yr"]'),
            type = $('select[name="type"]');
        if (fname.val() == '' || mname.val() == '' || lname.val() == '' || course.val() == '' || yr.val() == '' || type.val() == '') {
            $(".box_reg").addClass("animate__animated animate__shakeX");
            btn.html('Fill Up All Fields');
            btn.addClass("wmsu_err");
            setTimeout(function () {
                btn.html('<i class="wmsu_btn_ic fa fa-arrow-right"></i>');
                btn.removeClass("wmsu_err");
                $(".box_reg").removeClass("animate__animated animate__shakeX");
            }, 1000);
        } else {
            $(".first").slideUp(250);
            $(".cred").slideDown(250);
        }
    });
    $(".reg_student").submit(function (e) {
        e.preventDefault()
        toast.fire({
            timer: 0,
            title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i>Please Wait',
        })
        $.ajax({
            url: '/register',
            method: 'POST',
            contentType: false,
            cache: false,
            processData: false,
            data: new FormData(this),
            success: function (reg) {
                if (reg.islogin) {
                    toast.fire({
                        icon: 'success',
                        title: reg.msg,
                    }).then((next) => {
                        window.location.reload(true)
                    })
                } else {
                    toast.fire({
                        icon: 'error',
                        title: reg.msg
                    })
                }
            },
        });
    });
    //back reg 
    $(".back_reg").click(function () {
        $(".register_s").hide()
        $(".verify").show()
    })
    $(".back_reg_2").click(function () {
        $(".cred").hide()
        $(".first").show()
    })
});