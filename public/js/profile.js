$(document).ready( () => {
    $.ajaxSetup({
        timeout: 600000,
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    })
    //open cover photo 
    $(".add_cover_photo").click( function (e) {
        e.preventDefault() 
        const def = $(this).html()
        $(this).html(profile.loader())
        setTimeout( () => {
            $(".cover_photo").click()
            $(this).html(def)
        }, 1000)
    })
    let file = null
    $(".cover_photo").change( function (e) {
        $(".user_cover_photo").addClass("skeleton-image")
        $(".user_cover_photo").attr("data-src", $(".user_cover_photo").attr("src"))
        setTimeout( () => {
            $(".user_cover_photo").attr("src",  URL.createObjectURL(e.target.files[0])) 
            $(".user_cover_photo").removeClass("skeleton-image")  
            const parent = $(".confirm_cover_change")
            const child = $(".confirm_cover_change_main") 
            child.addClass(child.attr("animate-in")) 
            parent.addClass("flex") 
            parent.removeClass("hidden")
            setTimeout( () => {
                child.removeClass(child.attr("animate-in")) 
            }, 500)
        }, 500)
    })
    //confirm buttons 
    let action = false
    $(".confirm_cover_change").find(".confirm_cover_change_btn").click( async function (e) {
        e.preventDefault() 
        const confirm_photo = $(this).attr("data") === "confirm" ? true : false
        if(!action){
            if(confirm_photo) {
                const parent = $(".uploading_")
                const child = $(".uploading_main")
                action = true 
                let data = new FormData()
                data.append('coverPhoto', $(".cover_photo")[0].files[0])
                $.ajax({
                    xhr: function() {
                        var xhr = new window.XMLHttpRequest()
                        xhr.upload.addEventListener("progress", function(e) {
                            if (e.lengthComputable) {
                                child.text(`${Math.floor(((e.loaded / e.total) * 100))} %`)
                            }
                        }, false)
                        return xhr
                    },
                    type: 'POST',
                    url: 'change-cover-photo/',
                    data: data,
                    contentType: false,
                    cache: false,
                    processData:false,
                    beforeSend: function(){
                        child.addClass(child.attr("animate-in"))
                        parent.addClass("flex")
                        parent.removeClass("hidden")
                        child.text('...')
                        setTimeout( () => {
                            child.removeClass(child.attr("animate-in"))
                        }, 500)
                    },
                    error: (e) => {
                        action = false
                        toast.fire({
                            icon: 'error', 
                            title: e.message, 
                            timer: 2500
                        }).then( () => {
                            child.addClass(child.attr("animate-out")) 
                            setTimeout( () => {
                                parent.addClass("hidden")
                                parent.removeClass("flex")
                                child.removeClass(child.attr("animate-out"))
                                child.text('')
                            }, 500)
                        })
                    },
                    success: (res) => {
                        action = false 
                        $(".cover_photo").val('')
                        toast.fire({
                            icon: res.status ? 'success' : 'info', 
                            title: res.msg, 
                            timer: 2500
                        }).then( () => {
                            //close uploading
                            child.addClass(child.attr("animate-out")) 
                            setTimeout( () => {
                                parent.addClass("hidden")
                                parent.removeClass("flex")
                                child.removeClass(child.attr("animate-out"))
                                child.text('')
                            }, 500)
                            //close cover photo promt 
                            const cover_parent = $(".confirm_cover_change")
                            const cover_child = $(".confirm_cover_change_main")
                            cover_child.addClass(cover_child.attr("animate-out")) 
                            setTimeout( () => {
                                cover_child.removeClass(cover_child.attr("animate-out")) 
                                cover_parent.addClass("hidden") 
                                cover_parent.removeClass("flex")
                            }, 500)
                        })
                    }
                })
            } else {
                $(".cover_photo").val('')
                const parent = $(".confirm_cover_change")
                const child = $(".confirm_cover_change_main") 
                child.addClass(child.attr("animate-out")) 
                setTimeout( () => {
                    parent.addClass("hidden") 
                    parent.removeClass("flex")
                    child.removeClass(child.attr("animate-out")) 
                    $(".user_cover_photo").addClass("skeleton-image")
                    setTimeout( () => {
                        $(".user_cover_photo").attr("src", $(".user_cover_photo").attr("data-src"))
                        $(".cover_photo").val('')
                        $(".user_cover_photo").removeClass("skeleton-image")
                    }, 500) 
                }, 500)
            }
        }
    })
    //add profile photo 
    $(".add_user_profile_photo").click( function(e) {
        e.preventDefault() 
        const def = $(this).html()
        $(this).html(profile.loader())
        setTimeout( () => {
            $(".profile_photo").click()
            $(this).html(def)
        }, 1000)
    })
    $(".profile_photo").change( function (e) {
        $(".user_profile_photo").addClass("skeleton-image")
        $(".user_profile_photo").attr("src", null) 
        setTimeout( () => {
            $(".user_profile_photo").attr("src",  URL.createObjectURL(e.target.files[0])) 
            $(".user_profile_photo").removeClass("skeleton-image")
        }, 500)
    })
    const profile = {
        loader: () => {
            return '<i class="fad animate-spin fa-spinner-third"></i>'
        }
    }
})