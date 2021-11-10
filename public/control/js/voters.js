$(document).ready( () => {
    //open add voter 
    $(".add_voter_open").click( () => {
        const parent = $(".user_add")
        const child = $(".user_add_main")
        child.addClass(child.attr("animate-in"))
        parent.addClass("flex")
        parent.removeClass("hidden") 
        setTimeout( async () => {
            child.removeClass(child.attr("animate-in"))
            await voter.search('')
        }, 500)
    })
    //close add voter 
    $(".user_add").click( function (e) {
        if($(e.target).hasClass("user_add")){
            e.preventDefault()
            const parent = $(".user_add")
            const child = $(".user_add_main")
            child.addClass(child.attr("animate-out"))
            setTimeout( async () => {
                child.removeClass(child.attr("animate-out"))
                parent.addClass("hidden")
                parent.removeClass("flex") 
                $(".users_list").find(".users_skeleton").show()
                $(".users_list").find(".users_").remove()
            }, 500)
        }
    })
    $(".cls_user_add").click( () =>{
        const parent = $(".user_add")
        const child = $(".user_add_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( async () => {
            child.removeClass(child.attr("animate-out"))
            parent.addClass("hidden")
            parent.removeClass("flex") 
            $(".users_list").find(".users_skeleton").show()
            $(".users_list").find(".users_").remove()
        }, 500)
    })
    setTimeout( async () => {
        await voter.voters()
    }, 1000)
    const voter = {
        voters: async () => {
            try {
                $(".election_voters_list").find(".election_voter_skeleton").show() 
                $(".election_voters_list").find(".election_voter").remove() 
                const req = await fetchtimeout('/control/elections/voters/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok) {
                    const res = await req.text() 
                    $(".election_voters_list").find(".election_voter_skeleton").hide() 
                    $(".election_voters_list").append(res)
                } else{ 
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                voter.error(e.message)
            }
        },
        search: async (search) => {
            try {
                search_usr = true
                let data = new FormData()
                data.append("search", search)
                $(".users_list").find(".users_skeleton").show()
                $(".users_list").find(".users_").remove()
                const req = await fetchtimeout('/control/elections/voters/search-users/', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    },
                    body: data
                })
                if(req.ok) {
                    const res = await req.text()
                    search_usr = false
                    $(".users_list").find(".users_skeleton").hide()
                    $(".users_list").find(".users_").remove()
                    $(".users_list").append(res)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                search_usr = false
                toast.fire({
                    icon: 'error',
                    title: e.message,
                    timer: 2500
                })
            }
        },
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