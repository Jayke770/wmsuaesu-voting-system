'use stirct'
$(document).ready( () => {
    //set timeout for all ajax requests 
    $.ajaxSetup({
        timeout: 30000,
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    })
    $(".add_voter").click( () => {
        if($(".popup").hasClass("hidden")){
            $(".add_voter_id").addClass($(".add_voter_id").attr("animate-in"))
            $(".popup").removeClass("hidden")
            setTimeout( () => {
                $(".add_voter_id").removeClass($(".add_voter_id").attr("animate-in"))
            }, 700)
        }
    })
    $(".cls_add_voter_id").click( () => {
        if(!$(".popup").hasClass("hidden")){
            $(".add_voter_id").removeClass($(".add_voter_id").attr("animate-in"))
            $(".add_voter_id").addClass($(".add_voter_id").attr("animate-out"))
            setTimeout( () => {
                $(".add_voter_id").removeClass($(".add_voter_id").attr("animate-out"))
                $(".popup").addClass("hidden")
            }, 600)
        }
    })
    $(".popup").click(function(e){
        if($(e.target).hasClass("add_voter_id")){
            if(!$(".popup").hasClass("hidden")){
                $(".add_voter_id").removeClass($(".add_voter_id").attr("animate-in"))
                $(".add_voter_id").addClass($(".add_voter_id").attr("animate-out"))
                setTimeout( () => {
                    $(".add_voter_id").removeClass($(".add_voter_id").attr("animate-out"))
                    $(".popup").addClass("hidden")
                }, 600)
            }
        }
    })
    //submit add voter id
    let add_voter_id = false
    $(".add_voter_id_form").submit(async function(e){
        e.preventDefault()
        const def = $(this).find("button[type='submit']").html() 
        if(!add_voter_id){
            try {
                add_voter_id = true 
                $(this).find("button[type='submit']").html(voter.loader())
                const req = await fetchtimeout("/control/elections/voter-id/add-voter-id/", {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    add_voter_id = false
                    $(this).find("button[type='submit']").html(def)
                    toast.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.msg, 
                        timer: 2000
                    })
                    await voter.ids(false)
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            } catch (e) {
                add_voter_id = false
                $(this).find("button[type='submit']").html(def)
                toast.fire({
                    icon: 'error', 
                    title: res.msg, 
                    timer: 3000
                })
            }
        }
    })
    //delete voter id 
    let delete_voter_id = false
    $(".voters_id_all").delegate(".delete_voter_id", "click", function(e){
        e.preventDefault()
        Swal.fire({
            icon: 'question', 
            title: 'Delete Voter ID', 
            html: 'Are you sure you want to delete this Voter ID', 
            backdrop: true, 
            allowOutsideClick: false,
            showDenyButton: true, 
            confirmButtonText: 'Yes'
        }).then( (a) => {
            if(a.isConfirmed){
                Swal.fire({
                    icon: 'info', 
                    title: 'Deleting Voter ID', 
                    html: 'Please wait...', 
                    backdrop: true, 
                    allowOutsideClick: false, 
                    showConfirmButton: false,
                    willOpen: async () => {
                        Swal.showLoading()
                        try {
                            delete_voter_id = true
                            let data = new FormData() 
                            data.append("id", $(this).attr("data"))
                            const req = await fetchtimeout("/control/elections/voter-id/delete-voter-id/", {
                                method: 'POST', 
                                headers: {
                                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                }, 
                                body: data
                            })
                            if(req.ok) {
                                const res = await req.json()
                                delete_voter_id = false
                                Swal.fire({
                                    icon: res.status ? 'success' : 'info', 
                                    title: res.txt, 
                                    html: res.msg,
                                    backdrop: true, 
                                    allowOutsideClick: false,
                                })
                                res.status ? $(`.voter_ids[data='${$(this).attr("data")}']`).remove() : $(`.voter_ids[data='${$(this).attr("data")}']`).attr("data", $(this).attr("data"))
                            } else {
                                throw new Error(`${req.status} ${req.statusText}`)
                            }
                        } catch (e) {
                            delete_voter_id = false
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
        })
    })
    //sort
    let sort_voter_id = false
    $(".sort_voter_id").change(async function(){
        if(!sort_voter_id && $(this).val()){
            await voter.sort($(this).val())
        }
    })
    //search
    let search_voter_id = false
    $(".search_voter_id").keyup(function () {
        if (!search_voter_id && $(this).val()){
            setTimeout( async () => {
                await voter.search($(this).val())
            }, 500)
        }
    })
    $(".search_voter_id").keydown( function () {
        if (!search_voter_id && !$(this).val()) {
            setTimeout( async () => {
                await voter.search($(this).val())
            }, 500)
        }
    })
    $(".voters_id_all").delegate(".update_voter_id", "click", function(e) {
        e.preventDefault() 
        $(".edit_form").addClass($(".edit_form").attr("animate-in"))
        $(".popup_2").removeClass("hidden")
        $(".popup_2").attr("data", $(this).attr("data"))
        setTimeout(() => {
            $(".edit_form").removeClass($(".edit_form").attr("animate-in"))
        }, 500)
    })
    let edit_v_id = false
    $(".edit_voter_id_form").submit(async function(e){
        e.preventDefault() 
        const def = $(this).find("button[type='submit']").html()
        let data = new FormData(this)
        data.append("id", $(".popup_2").attr("data")) 
        if(!edit_v_id){
            edit_v_id = true
            $(this).find("button[type='submit']").html(voter.loader())
            try {
                const req = await fetchtimeout("/control/elections/voter-id/update-voter-id/", {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.json() 
                    edit_v_id = false
                    $(this).find("button[type='submit']").html(def)
                    $(this).find("button[type='reset']").click()
                    toast.fire({
                        icon: res.status ? 'success' : 'info', 
                        title: res.msg, 
                        timer: 3000
                    })
                    await voter.ids(false)
                } else {
                    throw new Error(e)
                }
            } catch (e) {
                edit_v_id = false
                $(this).find("button[type='submit']").html(def)
                Snackbar.show({
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                            <span>Connection Error</span>
                     </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }
    })
    $(".close_edit_voter").click( () => {
        $(".edit_form").addClass($(".edit_form").attr("animate-out"))
        setTimeout( () => {
            $(".popup_2").addClass("hidden")
            $(".edit_form").removeClass($(".edit_form").attr("animate-out"))
        }, 500)
    })
    $(".popup_2").click( function(e) {
        if($(e.target).hasClass("edit_form")){
            $(".edit_form").addClass($(".edit_form").attr("animate-out"))
            setTimeout( () => {
                $(".popup_2").addClass("hidden")
                $(".edit_form").removeClass($(".edit_form").attr("animate-out"))
            }, 500)
        }
    })
    setTimeout(async () => {
        Snackbar.show({ 
            text: `
                <div class="flex justify-center items-center gap-2"> 
                    <i style="font-size: 1.25rem;" class="fad animate-spin fa-spinner-third"></i>
                    <span>Fetching Voter ID's</span>
                </div>
            `, 
            duration: false,
            showAction: false
        })
        await voter.ids(true)
    }, 1000) 
    //functions
    const voter = {
        search: async (val) => {
            try {
                search_voter_id = true
                $(".voters_id_all").find(".voters_id_skeleton").show()
                $(".voters_id_all").find(".voter_ids").hide()
                let data = new FormData() 
                data.append("search", val)
                const req = await fetchtimeout('/control/elections/voter-id/search-voter-id/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text() 
                    search_voter_id = false 
                    $(".voters_id_all").find(".voter_ids").remove()
                    $(".voters_id_all").find(".voters_id_skeleton").hide()
                    $(".voters_id_all").append(res)
                } else {
                    throw new Error(e)
                }
            } catch (e) {
                search_voter_id = false
                $(".voters_id_all").find(".voter_ids").show()
                $(".voters_id_all").find(".voters_id_skeleton").hide()
                Snackbar.show({
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                            <span>Connection Error</span>
                    </div>
                    `,
                    duration: 3000,
                    showAction: false
                })
            }
        }, 
        sort: async (val) => {
            try {
                let data = new FormData() 
                data.append("sort", val)
                $(".voters_id_all").find(".voters_id_skeleton").show()
                $(".voters_id_all").find(".voter_ids").hide()
                const req = await fetchtimeout('/control/elections/voter-id/sort-voter-id/', {
                    method: 'POST', 
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }, 
                    body: data
                })
                if(req.ok){
                    const res = await req.text() 
                    search_voter_id = false 
                    $(".voters_id_all").find(".voter_ids").remove()
                    $(".voters_id_all").find(".voters_id_skeleton").hide()
                    $(".voters_id_all").append(res)
                } else {
                    throw new Error(e)
                }
            } catch (e) {
                sort_voter_id = false
                $(".voters_id_all").find(".voter_ids").show()
                $(".voters_id_all").find(".voters_id_skeleton").hide()
                Snackbar.show({
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                            <span>Connection Error</span>
                     </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }, 
        ids: async (snackbar) => {
            try {
                const res = await fetchtimeout('/control/elections/voter-id/ids/', {
                    headers: {
                        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                    },
                    method: 'POST'
                })
                if(res.ok){
                    const data = await res.text()
                    $(".voters_id_all").find(".voters_id_skeleton").hide()
                    $(".voters_id_all").find(".voter_ids").remove()
                    $(".voters_id_all").append(data) 
                    snackbar ? Snackbar.show({ 
                        text: "All Voter ID's Fetch",
                        duration: 2000, 
                        actionText: 'Okay'
                    }) : console.log('SnackBar is Hidden')
                } else {
                    throw new Error(`${res.status} ${res.statusText}`)
                }
            } catch (e) {
                Snackbar.show({ 
                    text: 'Connection Error',
                    actionText: 'Retry',
                    duration: false, 
                    onActionClick: () => {
                        Snackbar.show({ 
                            text: `
                                <div class="flex justify-center items-center gap-2"> 
                                    <i style="font-size: 1.25rem;" class="fad animate-spin fa-spinner-third"></i>
                                    <span>Retrying...</span>
                                </div>
                            `, 
                            duration: false,
                            showAction: false
                        }) 
                    }
                })
            }
        }, 
        loader: () => {
            return '<i class="fad animate-spin fa-spinner-third"></i>'
        }, 
    }
})