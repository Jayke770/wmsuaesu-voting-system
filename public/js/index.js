$(document).ready( () => { 
    //open navigation 
    $(".open_nav").click( () => {
        const parent = $(".nav") 
        const child = $(".nav_main") 
        child.addClass(child.attr("animate-in")) 
        parent.removeClass("hidden") 
        setTimeout( () => {
            child.removeClass(child.attr("animate-in")) 
        }, 300)
    }) 
    //close navigation 
    $(".cls_nav").click( () => {
        const parent = $(".nav") 
        const child = $(".nav_main") 
        child.addClass(child.attr("animate-out")) 
        setTimeout( () => {
            parent.addClass("hidden") 
            child.removeClass(child.attr("animate-out")) 
        }, 300)
    })
    $(".nav").click( function(e) {
        if($(e.target).hasClass("nav")){
            const parent = $(".nav") 
            const child = $(".nav_main") 
            child.addClass(child.attr("animate-out")) 
            setTimeout( () => {
                parent.addClass("hidden") 
                child.removeClass(child.attr("animate-out")) 
            }, 300)
        }
    })
    //join election 
    $(".e_join_election").click( function (e) {
        e.preventDefault() 
        let data = new FormData() 
        Swal.fire({
            icon: 'question',
            title: 'Enter election passcode',  
            backdrop: true, 
            allowOutsideClick: false, 
            input: 'text',
            inputPlaceholder: 'Passcode',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
                autocomplete: 'off',
                required: 'true'
            },
            showCancelButton: true,
            inputValidator: (val) => {
                if(val){
                    data.append("code", val)
                    Swal.fire({
                        icon: 'info', 
                        html: 'Please wait...', 
                        title: 'Joining to election', 
                        showConfirmButton: false,
                        backdrop: true,
                        allowOutsideClick: false, 
                        willOpen: async () => {
                            Swal.showLoading()
                            try {
                                const join = await fetchtimeout('join-election/', {
                                    headers: {
                                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                    },
                                    method: 'POST', 
                                    body: data
                                })
                                if(join.ok){
                                    const res = await join.json() 
                                    if(res.joined){
                                        Swal.fire({
                                            icon: 'success', 
                                            title: res.msg,
                                            html: 'Redirecting...',
                                            backdrop: true,
                                            allowOutsideClick: false, 
                                            showConfirmButton: false,
                                            willOpen: () => {
                                                Swal.showLoading()
                                                setTimeout( () => {
                                                    window.location.assign('')
                                                }, 1000)
                                            }
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info', 
                                            title: res.msg, 
                                            html: res.text,
                                            backdrop: true,
                                            allowOutsideClick: false, 
                                        })
                                    }
                                } else {
                                    throw new Error(`${join.status} ${join.statusText}`)
                                }
                            } catch (e) {
                                Swal.fire({
                                    icon: 'error', 
                                    title: 'Connection Error', 
                                    html: e.message,
                                    backdrop: true,
                                    allowOutsideClick: false, 
                                })
                            }
                        }
                    })
                }
            }
        })
    })
    //leave election 
    $(".e_left_election").click( function (e) {
        e.preventDefault() 
        Swal.fire({
            icon: 'question', 
            title: 'Are you sure you want to leave?', 
            backdrop: true, 
            showDenyButton: true, 
            cancelButtonText: 'No',
            confirmButtonText: 'Yes', 
        }).then( (res) => {
            if(res.isConfirmed){
                Swal.fire({
                    title: 'Leaving election', 
                    html: 'Please wait...', 
                    backdrop: true, 
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    willOpen: async () => {
                        Swal.showLoading() 
                        try {
                            const leave = await fetchtimeout('/leave-election', {
                                headers: {
                                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                                }, 
                                method: 'POST'
                            })
                            if(leave.ok){
                                const res = await leave.json()
                                if(res.leave){
                                    Swal.fire({
                                        icon: 'success', 
                                        title: res.msg, 
                                        backdrop: true, 
                                        allowOutsideClick: false
                                    }).then( () => {
                                        window.location.assign('')
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'info', 
                                        title: res.msg, 
                                    })
                                }
                            } else {
                                throw new Error(`${leave.status} ${leave.statusText}`)
                            }
                        } catch (e) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Connection Error', 
                                html: e.message
                            })
                        }
                    }
                })
            }
        })
    })
})