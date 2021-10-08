$(document).ready(function () {
    $.ajaxSetup({
        timeout: 30000,
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    })
    //login
    $(".auth_login").submit(function (e) {
        e.preventDefault();
        Swal.fire({
            title: 'Please Wait', 
            imageUrl: '/assets/logo.png',
            imageAlt: 'logo',
            showConfirmButton: false,
            backdrop: true,
            willOpen: () => {
                Swal.showLoading()
                $.ajax({
                    url: '/login',
                    method: 'POST',
                    cache: false,
                    contentType: false,
                    processData: false,
                    data: new FormData(this),
                    success: (res_log) => {
                        if (res_log.islogin) {
                            Swal.fire({
                                icon: 'success', 
                                backdrop: true, 
                                showConfirmButton: false,
                                allowOutsideClick: false,
                                title: res_log.msg,
                                willOpen: () => {
                                    Swal.showLoading()
                                    setTimeout( () => {
                                        window.location.assign('')
                                    }, 1000)
                                }
                            })
                        } else {
                            Swal.fire({
                                icon: 'question', 
                                backdrop: true, 
                                allowOutsideClick: false,
                                title: res_log.msg,
                            })
                        }
                    },
                    error: (res) => {
                        Swal.fire({
                            icon: 'error', 
                            title: 'Connection error',
                            html: `${res.status} ${res.statusText}`,
                            backdrop: true, 
                            allowOutsideClick: false,
                        })
                    }
                });
            },
            allowOutsideClick: () => !Swal.isLoading()
        })
    })
    //effects
    $("input[type='password']").on("keyup keydown", function () {
        var attr = $(this).attr("show-pass")
        if (attr == "true") {
            if ($(this).val() !== "") {
                $(".show_pass").removeClass("hidden")
            }
            else {
                $(".show_pass").addClass("hidden")
            }
        }
    })
    //verify student id
    $(".get_id").submit(function (e) {
        e.preventDefault()
        const next = `.${$(this).attr("next")}`
        const parent = `.${$(this).attr("parent")}`
        $(".check_id").attr("disabled", true)
        Swal.fire({
            title: 'Please Wait', 
            html: 'Checking Student ID',
            showConfirmButton: false,
            backdrop: true,
            willOpen: () => {
                Swal.showLoading()
                $.ajax({
                    url: '/verify',
                    method: 'POST', 
                    cache: false, 
                    contentType: false, 
                    processData: false, 
                    data: new FormData(this), 
                    success: (res) => {
                        if(res.isvalid === true){
                            $(".student_id").val(res.id)
                            Swal.fire({
                                icon: 'success', 
                                title: res.msg, 
                                html: 'Please Wait..', 
                                backdrop: true, 
                                timer: 500,
                                allowOutsideClick: false, 
                                showConfirmButton: false
                            }).then( () => {
                                setTimeout( () => {
                                    $(".check_id").attr("disabled", false)
                                    $("input[name='id']").val('')
                                    $(parent).removeClass($(parent).attr("animate-in"))
                                    $(parent).addClass($(parent).attr("animate-out"))
                                    setTimeout( () => {
                                        $(parent).removeClass('flex')
                                        $(parent).addClass('hidden')
                                        $(next).addClass($(next).attr("animate-in"))
                                        $(next).removeClass('hidden')
                                        $(next).addClass('flex')
                                        setTimeout( () => {
                                            $(next).removeClass($(next).attr("animate-in"))
                                        }, 250)
                                    }, 200)
                                }, 100)
                            })
                        }
                        if(res.isvalid === null){
                            Swal.fire({
                                icon: 'info', 
                                title: res.msg, 
                                html: 'Make sure Student ID is Valid', 
                                backdrop: true, 
                                allowOutsideClick: false
                            }).then( () => {
                                $(".check_id").attr("disabled", false)
                                $("input[name='id']").val('')
                            })
                        }
                        if(res.isvalid === false){
                            Swal.fire({
                                icon: 'error', 
                                title: res.msg, 
                                html: "Make sure this Student ID is yours", 
                                backdrop: true, 
                                allowOutsideClick: false
                            }).then( () => {
                                $(".check_id").attr("disabled", false)
                                $("input[name='id']").val('')
                            })
                        }
                    }, 
                    error: (res) => {
                        if(res.statusText == 'timeout'){
                            Swal.fire({
                                icon: 'info', 
                                title: 'Connection Timeout',
                                html: 'Please check your internet connection',
                                backdrop: true, 
                                allowOutsideClick: false,
                            }).then( () => {
                                $(".check_id").attr("disabled", false)
                                $("input[name='id']").val('')
                            })
                        } else {
                            Swal.fire({
                                icon: 'info', 
                                title: 'Connection Error',
                                html: 'Please check your internet connection',
                                backdrop: true, 
                                allowOutsideClick: false,
                            }).then( () => {
                                $(".check_id").attr("disabled", false)
                                $("input[name='id']").val('')
                            })
                        }
                    }
                })
            }, 
            allowOutsideClick: () => !Swal.isLoading()
        })
    })

    //show password
    $(".show_pass").click(function () {
        var input = $('input[show-pass=true]')
        var icon = '<i class="fas fa-eye-slash dark:text-gray-100 cursor-pointer"></i>'
        var icon_2 = '<i class="fas fa-eye dark:text-gray-100 cursor-pointer"></i>'
        if(input.attr("type") === "password"){
            $(this).html(icon_2)
            input.attr("type", "text")
        }
        else if(input.attr("type") === "text"){
            $(this).html(icon)
            input.attr("type", "password")
        }
        else{
            console.error("Unknown Input : ", input)
        }
    })
    //register button 
    $(".register").click(function (e) {
        e.preventDefault()
        const next = `.${$(this).attr("next")}`
        const parent = `.${$(this).attr("parent")}`
        $(parent).removeClass($(parent).attr("animate-in"))
        $(parent).addClass($(parent).attr("animate-out"))
        setTimeout( () => {
            $(parent).addClass('hidden')
            $(parent).removeClass('flex')
            $(next).addClass(`flex ${$(next).attr("animate-in")}`)
            $(next).removeClass('hidden')
            setTimeout( () => {
                $(next).removeClass($(next).attr("animate-in"))
            }, 200)
        }, 400)
    })

    //back button 
    $(".back_page").click(function(e){
        e.preventDefault()
        const prev = `.${$(this).attr("prev")}`
        const next = `.${$(this).attr("next")}`
        const parent = `.${$(this).attr("parent")}`
        $(parent).removeClass($(parent).attr("animate-in"))
        $(parent).addClass($(parent).attr("animate-out"))
        setTimeout( () => {
            $(parent).removeClass(`flex ${$(parent).attr("animate-out")}`)
            $(parent).addClass('hidden')
            $(prev).removeClass($(prev).attr("animate-out"))
            $(prev).addClass(`flex ${$(prev).attr("animate-in")}`)
            $(prev).removeClass('hidden')
            setTimeout( () => {
                $(prev).removeClass($(prev).attr("animate-in"))
            }, 200)
        }, 400)
    })
    //register form 
    $(".reg_student").submit(function (e) {
        e.preventDefault()
        Swal.fire({
            title: 'Please wait...', 
            backdrop: true, 
            imageUrl: '/assets/logo.png',
            imageAlt: 'logo',
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading()
                $.ajax({
                    url: '/register',
                    method: 'POST',
                    contentType: false,
                    cache: false,
                    processData: false,
                    data: new FormData(this),
                    success: (res) => {
                        if(res.islogin){
                            Swal.fire({
                                icon: 'success', 
                                title: res.msg, 
                                backdrop: true, 
                                showConfirmButton: false, 
                                allowOutsideClick: false, 
                                willOpen: () => {
                                    Swal.showLoading() 
                                    window.location.reload(true)
                                }
                            })
                        }
                        else{
                            Swal.fire({
                                icon: 'info', 
                                title: res.msg, 
                                html: res.text,
                                backdrop: true,
                                allowOutsideClick: false
                            })
                        }
                    }, 
                    error: (res) => {
                        Swal.fire({
                            icon: 'error', 
                            title: res.status, 
                            html: res.statusText, 
                            backdrop: true, 
                            allowOutsideClick: false
                        })
                    }
                })
            },
            allowOutsideClick: () => !Swal.isLoading()
        })
    })
    //next cred 
    $(".next_cred").click(function(e){
        e.preventDefault()
        const next = `.${$(this).attr("next")}`
        const parent = `.${$(this).attr("parent")}` 
        let isvalid_input = true
        const inputs = [
            $("input[name='fname'").val(),
            $("input[name='mname'").val(),
            $("input[name='lname'").val(),
            $("select[name='course'").val(),
            $("select[name='yr'").val(),
            $("select[name='type'").val()
        ]
        for(let i = 0; i < inputs.length; i++){
            if(!inputs[i]){
                isvalid_input = false
            }
        }
        if(isvalid_input){
            $(".reg_back_page").attr("data", "true")
            $(parent).removeClass($(parent).attr("animate-in"))
            $(parent).addClass($(parent).attr("animate-out"))
            setTimeout( () => {
                $(parent).removeClass('grid')
                $(parent).addClass('hidden')
                $(next).addClass($(next).attr("animate-in"))
                $(next).removeClass('hidden')
                $(next).addClass('grid')
                setTimeout( () => {
                    $(next).removeClass($(next).attr("animate-in"))
                }, 150)
            }, 400)
        }
        else{
            Swal.fire({
                icon: 'info', 
                title: 'Fill up all feilds', 
                backdrop: true, 
                allowOutsideClick: false
            })
        }
    })
    //register back button 
    $(".reg_back_page").click(function(e){
        e.preventDefault() 
        const data = $(this).attr("data")
        const prev = `.${$(this).attr("prev")}`
        const parent = `.${$(this).attr("parent")}` 
        if(data === 'false'){
            $(parent).removeClass($(parent).attr("animate-in"))
            $(parent).addClass($(parent).attr("animate-out"))
            setTimeout( () => {
                $(parent).removeClass("flex")
                $(parent).addClass("hidden")
                $(prev).removeClass($(prev).attr("animate-out"))
                $(prev).addClass($(prev).attr("animate-in"))
                $(prev).removeClass("hidden")
                $(prev).addClass("flex")
                setTimeout( () => {
                    $(prev).removeClass($(prev).attr("animate-in"))
                    $(parent).removeClass($(parent).attr("animate-out"))
                }, 200)
            }, 400)
        }
        else{
            const parent2 = $(".cred")
            const prev2 = $(".basic_info")
            $(".reg_back_page").attr("data", "false")
            parent2.removeClass($(parent2).attr("animate-in"))
            parent2.addClass($(parent2).attr("animate-out"))
            setTimeout( () => {
                parent2.removeClass("grid")
                parent2.addClass("hidden")
                prev2.removeClass($(prev2).attr("animate-out"))
                prev2.addClass($(prev2).attr("animate-in"))
                prev2.addClass('grid')
                prev2.removeClass("hidden")
                setTimeout( () => {
                    prev2.removeClass($(prev2).attr("animate-in"))
                }, 200)
            }, 400)
        }
    })
})