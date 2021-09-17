$(document).ready(() => {
    //get the election starting time  
    let e_start = (new Date($("body").find("#e_time").attr("data")).getTime() / 1000), start = false
    let flipdown = new FlipDown(e_start, "e_time")
    flipdown.start()
    flipdown.ifEnded(() => {
        //check if the flipDown started attr is = to true 
        const status = $("body").find("#e_time").attr("started")
        if (status !== "true") {
            alert("fasfs")
        }
    })
    //set the theme of flipdown 
    const theme = localStorage.getItem('theme') === "dark" ? true : false
    $("body").find("#e_time").removeClass(theme ? 'flipdown__theme-dark' : 'flipdown__theme-light')
    $("body").find("#e_time").addClass(theme ? 'flipdown__theme-light' : 'flipdown__theme-dark')

    //open navigation 
    $(".e_nav").click(() => {
        const nav = $(".e_nav_main")
        nav.addClass(nav.attr("animate-in"))
        nav.removeClass("xl:hidden")
        setTimeout(() => {
            nav.removeClass(nav.attr("animate-in"))
        }, 300)
    })
    //close navigation 
    $(".cls_e_nav").click(() => {
        const nav = $(".e_nav_main")
        nav.addClass(nav.attr("animate-out"))
        setTimeout(() => {
            nav.addClass("xl:hidden")
            nav.removeClass(nav.attr("animate-out"))
        }, 300)
    })
    $(".election_btn").click(function (e) {
        e.preventDefault()
        const parent = $(`.${$(this).attr("data")}_`)
        const child = $(`.${$(this).attr("data")}_main`)
        parent.addClass("flex")
        child.addClass(child.attr("animate-in"))
        parent.removeClass("hidden")
        setTimeout(() => {
            child.removeClass(child.attr("animate-in"))
            if($(this).attr("data") === "voters"){   
                voters("/control/elections/accepted-voters/", $("html").attr("data"))
            }
        }, 300)
    })
    $(".e_ac").click( () => {
        voters("/control/elections/accepted-voters/", $("html").attr("data"))
    })
    $(".e_pend").click( () => {
        voters("/control/elections/pending-voters/", $("html").attr("data"))
    })
    //close voters pop up 
    $(".close_voters").click(() => {
        $(".voters_main").addClass($(".voters_main").attr("animate-out"))
        setTimeout(() => {
            $(".voters_").addClass("hidden")
            $(".voters_").removeClass("flex")
            $(".voters_main").removeClass($(".voters_main").attr("animate-out"))
            $(".acp_voters").find(".acp_voters_skeleton").show()
            $(".acp_voters").find(".voters").remove()
        }, 300)
    })
    $(".voters_").click( function (e) {
        if($(e.target).hasClass("voters_")){
            $(".voters_main").addClass($(".voters_main").attr("animate-out"))
            setTimeout(() => {
                $(".voters_").addClass("hidden")
                $(".voters_").removeClass("flex")
                $(".voters_main").removeClass($(".voters_main").attr("animate-out"))
                $(".acp_voters").find(".acp_voters_skeleton").show()
                $(".acp_voters").find(".voters").remove()
            }, 300)
        }
    })
    // pending voters
    let ac_v = false 
    $(".acp_voters").delegate(".accept_voter", "click", async function (e) {
        e.preventDefault() 
        const data = new FormData()
        const def = $(this).html()  
        data.append("id", $(this).attr("data"))
        if(!ac_v){
            ac_v = true
            $(this).html('<i class="fad animate-spin fa-spinner-third"></i>')
            try {
                const accept = await fetchtimeout('/control/elections/accept-voter/', {
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }, 
                    method: 'POST', 
                    body: data
                })
                if(accept.ok){
                    const res = await accept.json() 
                    ac_v = false
                    $(this).html(def)
                    if(res.status){
                        toast.fire({
                            title: res.msg, 
                            icon: 'success', 
                            timer: 3000
                        }).then( () => {
                            $(`.voters[data='${ $(this).attr("data")}']`).remove() 
                        })
                    } else {
                        toast.fire({
                            title: res.msg, 
                            icon: 'info', 
                            timer: 3000
                        })
                    }
                } else {
                    ac_v = false
                    throw new Error(`${accept.status} ${accept.statusText}`)
                }
            } catch (e) {
                ac_v = false
                $(this).html(def)
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgb(225, 29, 72)" class="fad fa-times-circle"></i>
                            <span>Error : ${e.message}</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })  
            }
        } else {
            Snackbar.show({ 
                text: 'Please Wait', 
                duration: 3000,
                showAction: false
            })  
        }
    })
    //add more partylists 
    let add_pty_e = false
    $(".partylist_, .close_partylist").click( function(e) {
        if($(e.target).hasClass("partylist_")){
            $(".partylist_main").addClass($(".partylist_main").attr("animate-out"))
            setTimeout(() => {
                $(".partylist_").addClass("hidden")
                $(".partylist_").removeClass("flex")
                $(".partylist_main").removeClass($(".partylist_main").attr("animate-out"))
            }, 300)
        }
    })
    $(".close_partylist").click( () => {
        $(".partylist_main").addClass($(".partylist_main").attr("animate-out"))
        setTimeout(() => {
            $(".partylist_").addClass("hidden")
            $(".partylist_").removeClass("flex")
            $(".partylist_main").removeClass($(".partylist_main").attr("animate-out"))
        }, 300)
    })
    $(".add_pty_e").submit( async function(e) {
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html() 
        if(!add_pty_e){
            try {
                add_pty_e = true
                $(this).find("button[type='submit']").html('<i class="fad animate-spin fa-spinner-third"></i>')
                const add = await fetchtimeout('/control/elections/e-add-pty/', {
                    method: 'POST',
                    body: new FormData(this), 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }
                })
                if(add.ok){
                    const res = await add.json()
                    if(res.add){
                        toast.fire({
                            title: res.msg,
                            icon: 'success', 
                            timer: 3000
                        }).then( () => {
                            add_pty_e = false
                            $(this).find("button[type='submit']").html(def)
                            $(".e_partylist_list").append(`
                                <div data="partylist-${res.id}" class="animate__animated animate__fadeInUp  dark_border grid grid-cols-2 justify-center items-center dark:bg-darkBlue-secondary shadow-lg dark:text-gray-400 px-3 py-2 rounded-lg">
                                    <span>${partylist(res.id)}</span>
                                    <div class="flex justify-end items-center">
                                        <a data="${res.id}" class="e_remove_partylist rpl rounded-md cursor-pointer text-xl dark:text-red-600">
                                            <i class="fad fa-times-circle"></i>
                                        </a>
                                    </div>
                                </div>
                            `)
                        })
                    } else {
                        toast.fire({
                            title: res.msg,
                            icon: 'info', 
                            timer: 3000
                        }).then( () => {
                            add_pty_e = false
                            $(this).find("button[type='submit']").html(def)
                        })
                    }
                } else {
                    throw new Error(`${add.status} ${add.statusText}`)
                }
            } catch (e) {
                add_pty_e = false
                $(this).find("button[type='submit']").html(def)
                Snackbar.show({ 
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: rgb(225, 29, 72)" class="fad fa-times-circle"></i>
                            <span>Error : ${e.message}</span>
                        </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })  
            }
        }
    })
    //functions 
    async function voters(link, id){
        const data = new FormData() 
        data.append("id", id)
        try {
            const ac = await fetchtimeout(link, {
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                }, 
                method: 'POST', 
                body: data
            })
            if(ac.ok){
                const res = await ac.text() 
                $(".acp_voters").find(".acp_voters_skeleton").hide()
                $(".acp_voters").find(".voters").remove()
                $(".acp_voters").append(res)
            } else {
                throw new Error(`${ac.status} ${ac.statusText}`)
            }
        } catch (e) {
            Snackbar.show({ 
                text: `
                    <div class="flex justify-center items-center gap-2"> 
                        <i style="font-size: 1.25rem; color: rgb(225, 29, 72)" class="fad fa-times-circle"></i>
                        <span>Error : ${e.message}</span>
                    </div>
                `, 
                duration: 3000,
                showAction: false
            })  
        }
    }
    function partylist(id){
        const pty = JSON.parse($("body").find(".partylist").val())
        for(let i = 0; i < pty.length; i++){
            if(id === pty[i].id){
                return pty[i].type
            }
        }
    }
})