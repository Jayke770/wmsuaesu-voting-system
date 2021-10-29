$(document).ready( function () {
    setTimeout( async () => {
        await verify.Status()
    }, 1000)
    //add email in secure page 
    let secure_add_email = false, verifying = false
    $(".secure_verify").delegate(".secure_add_email", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html()
        if(!secure_add_email){
            try {
                secure_add_email = true 
                $(this).find("button[type='submit']").html(verify.loader()) 
                const req = await fetchtimeout('/account/settings/secure/add-email/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json()
                    res.status ? verifying = true : verifying = false
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg,
                        backdrop: true, 
                        allowOutsideClick: false,
                    }).then( async () => {
                        await verify.Status()
                        secure_add_email = false
                        $(this).find("button[type='submit']").html(def) 
                        $(this).find("button[type='reset']").click()
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                secure_add_email = false
                $(this).find("button[type='submit']").html(def) 
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
    //resend verification 
    let resend = false 
    $(".secure_verify").delegate(".secure_resend_email", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html()
        if(!resend){
            try {
                resend = true 
                $(this).find("button[type='submit']").html(verify.loader())
                const req = await fetchtimeout('/account/settings/secure/resend-email-verification/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.json() 
                    $(this).find("button[type='submit']").html(def)
                    resend = false 
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
                $(this).find("button[type='submit']").html(def)
                resend = false
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
    //verify device 
    let verify_device = false
    $(".secure_verify").delegate(".verify_device", "submit", async function (e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html() 
        if(!verify_device){
            try{
                verify_device = true 
                $(this).find("button[type='submit']").html(verify.loader())
                const req = await fetchtimeout('/account/settings/secure/verify-device/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    $(this).find("button[type='submit']").html(def)
                    verify_device = false 
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg,
                        backdrop: true, 
                        allowOutsideClick: false,
                    }).then( async () => {
                        res.status ? await verify.Status() : ''
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                $(this).find("button[type='submit']").html(def)
                verify_device = false
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
    //change email 
    let email_ch = false 
    $(".secure_verify").delegate(".change_email", "click", async function (e) {
        e.preventDefault() 
        const def = $(this).html() 
        if(!email_ch){
            try {
                $(this).html(verify.loader()) 
                email_ch = true 
                const req = await fetchtimeout('/account/settings/email/change-email/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.json() 
                    $(this).html(def) 
                    email_ch = false 
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg,
                        backdrop: true, 
                        allowOutsideClick: false,
                    }).then( async () => {
                        res.status ? await verify.Status() : ''
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {

            }
        }
    })
    setInterval( () => {
        if(verifying || $(".secure_verify").find(".secure_resend_email").length > 0){
            socket.emit('email-status', async (res) => {
                if(res.status){
                    verifying = false
                    $(".secure_verify").find(".secure_resend_email").removeClass("secure_resend_email")
                    await verify.Status()
                }
            })
        }
        if($(".secure_verify").find('input[name="verifying"]').length > 0){
            socket.emit('device-status', {id: $(".secure_verify").find('input[name="verifying"]').val()}, async (res) => {
                if(res.status){
                    $(".secure_verify").find('input[name="verifying"]').remove()
                    window.location.assign('')
                }
            })
        }
    }, 1000)
    const verify = {
        Status: async () => {
            try {
                const req = await fetchtimeout('/account/settings/secure/verify/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".loading_secure").removeClass("flex")
                    $(".loading_secure").addClass("hidden")
                    $(".secure_verify").find('.secure_verify_item').remove()
                    $(".secure_verify").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                            <span>${e.message}</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }, 
        loader: () => {
            return '<i class="fad animate-spin fa-spinner-third"></i>'
        }, 
    }
})