$(document).ready( function () {
    setTimeout( async () => {
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
    }, 1000)
})