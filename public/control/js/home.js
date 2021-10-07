$(document).ready(() => {
    setTimeout( () => {
        $(".elections").find(".icon_e_name").each( function() {
            $(this).removeClass("skeleton-image")
            $(this).attr("src", avatar($(this).attr("data"), "#fff", dark()) )
        })
    }, 1000)
    //open nav
    $(".open_nav").click(function () {
        const nav = $(".nav")
        nav.addClass(nav.attr("animate-in"))
        nav.removeClass("xl:hidden")
        setTimeout(() => {
            nav.removeClass(nav.attr("animate-in"))
        }, 300)
    })
    $(".close_nav").click(function () {
        const nav = $(".nav")
        nav.addClass(nav.attr("animate-out"))
        setTimeout(() => {
            nav.addClass("xl:hidden")
            nav.removeClass(nav.attr("animate-out"))
        }, 300)
    })
    //get all elections in every 10 seconds 
    setInterval( () => {
        socket.emit('elections', async (res) => {
            if(parseInt($("html").attr("elections")) !== res.elections){
                $("html").attr("elections", res.elections)
                await election.elections()
            }
        })
    }, 1000)
    //election functions 
    setTimeout( () => {
        election.elections()
    }, 1000)
    const election = {
        elections: async () => {
            try {
                const req = await fetchtimeout('/control/elections/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".elections").html(res)
                } else {    
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgba(34, 197, 94, 1);" class="fad fa-info-circle"></i>
                            <span>Connection Error</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }
    }
})