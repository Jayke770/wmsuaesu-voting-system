$(document).ready( function (){
    //add user 
    $(".add_user_open").click( () => {
        const parent = $(".add_user")
        const child = $(".add_user_main")
        child.addClass(child.attr("animate-in"))
        parent.addClass("flex")
        parent.removeClass("hidden")
        setTimeout( () => {
            child.removeClass(child.attr("animate-in"))
        }, 300)
    })
    //close add user 
    $(".add_user").click( function (e) {
        if($(e.target).hasClass("add_user")){
            const parent = $(".add_user")
            const child = $(".add_user_main")
            child.addClass(child.attr("animate-out"))
            setTimeout( () => {
                parent.addClass("hidden")
                parent.removeClass("flex")
                child.removeClass(child.attr("animate-out"))
            }, 300)
        }
    })
    $(".close_add_user").click( function (e) {
        const parent = $(".add_user")
        const child = $(".add_user_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            parent.addClass("hidden")
            parent.removeClass("flex")
            child.removeClass(child.attr("animate-out"))
        }, 300)
    })
    //add user submit 
    let add_user = false
    $(".add_user_form").submit( async function (e) {
        e.preventDefault() 
        console.log('fsaffaf')
        const def = $(this).find("button[type='submit']").html() 
        try {
            if(!add_user){
                add_user = true
                const req = await fetchtimeout("/control/users/add-user/", {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    },
                    body: new FormData(this)
                })
                if(req.ok){
                    const res = await req.json() 
                    add_user = false 
                    $(this).find("button[type='submit']").html(def) 
                    if(res.status){
                        $(this).find("button[type='reset']").click()
                        toast.fire({
                            icon: 'success', 
                            title: res.msg, 
                            timer: 3000
                        })
                    } else {
                        toast.fire({
                            icon: 'info', 
                            title: res.msg, 
                            timer: 3000
                        })
                    }
                } else {
                    throw new Error(`${req.status} ${req.statusText}`)
                }
            }
        } catch (e) {
            add_user = false 
            $(this).find("button[type='submit']").html(def) 
            toast.fire({
                icon: 'error', 
                title: e.message, 
                timer: 2000
            })
        }
    })
    setTimeout( () => {
        Data.users()
    }, 1000)
    const Data = {
        users: async () => {
            try {
                const req = await fetchtimeout("/control/users/all-users/", {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                    }
                })
                if(req.ok){
                    const res = await req.text() 
                    $(".all_users_list").html('')
                    setTimeout( () => {
                        $(".all_users_list").html(res)
                        Snackbar.show({ 
                            text: `
                                <div class="flex justify-center items-center gap-2"> 
                                    <i style="font-size: 1.25rem; color: rgba(34, 197, 94, 1);" class="fad fa-info-circle"></i>
                                    <span>Users Fetched Successfully</span>
                                </div>
                            `, 
                            duration: 3000,
                            showAction: false
                        })
                    }, 500)
                } else {
                    throw new Error(e)
                }
            } catch (e) {
                Snackbar.show({
                    text: `
                        <div class="flex justify-center items-center gap-2"> 
                            <i style="font-size: 1.25rem; color: red;" class="fad fa-info-circle"></i>
                            <span>Failed Fetch all users</span>
                     </div>
                    `, 
                    duration: 3000,
                    showAction: false
                })
            }
        }
    }
})