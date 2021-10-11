$(document).ready(() => {
    setTimeout( () => {
        $(".elections").find(".icon_e_name").each( function() {
            $(this).removeClass("skeleton-image")
            $(this).attr("src", avatar($(this).attr("data"), "#fff", dark()) )
        })
    }, 1000)
    //open nav
    $(".open_nav").click( () => {
        const parent = $(".nav_")
        const child = $(".nav_main")
        $(".menu_small").hide()
        child.addClass(child.attr("animate-in"))
        parent.removeClass("hidden")
        parent.addClass("flex")
        setTimeout( () => {
            child.removeClass(child.attr("animate-in"))
        }, 300)
    })
    //close nav
    $(".close_nav").click( () => {
        const parent = $(".nav_")
        const child = $(".nav_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            parent.removeClass("flex")
            parent.addClass("hidden")
            child.removeClass(child.attr("animate-out"))
        }, 300)
    })
    $(".nav_").click( function (e) {
        if($(e.target).hasClass("nav_")){
            const parent = $(".nav_")
            const child = $(".nav_main")
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                parent.removeClass("flex")
                parent.addClass("hidden")
                child.removeClass(child.attr("animate-out"))
            }, 300)
        }
    })
    //open menu 
    $(".open_menu_small").click( () => {
        if($(".menu_small").css("display") ==="none"){
            $(".menu_small").show()
        } else {
            $(".menu_small").hide()
        }
    })
    $(".menu_small").mouseleave( function(){
        $(this).hide()
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