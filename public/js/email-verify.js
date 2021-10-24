$(document).ready( function () {
    let submit_ = false
    $(".submit_email").submit( async function (e) {
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html()
        if(!submit_){
            try {
                $(this).find("button[type='submit']").html(pref.loader())
                submit_ = true 
                const req = await fetchtimeout('', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json()
                    Swal.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.txt, 
                        html: res.msg,
                    }).then( () => {
                        submit_ = false 
                        $(this).find("button[type='submit']").html(def)
                        $(this).remove()
                        $(".txt").remove()
                        $(".em").removeClass("hidden")
                        $(".em").addClass("flex")
                        $(".em").find(".em_status").text(res.txt)
                    })
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                submit_ = false 
                $(this).find("button[type='submit']").html(def)
                pref.error(e.message)
            }
        }
    })  
    const pref = {
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