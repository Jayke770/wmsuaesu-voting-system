"use strict"
$(document).ready( function() {
    $(".add_pos_btn").click( () => {
        const parent = $(".add_position")
        const child = $(".add_position_main")
        parent.removeClass("hidden")
        parent.addClass("flex")
        child.addClass(child.attr("animate-in"))
        setTimeout( () => {
            child.removeClass(child.attr("animate-in"))
        }, 400)
    })
    $(".close_add_pos").click( () => {
        const parent = $(".add_position")
        const child = $(".add_position_main")
        child.addClass(child.attr("animate-out"))
        setTimeout( () => {
            child.removeClass(child.attr("animate-out"))
            parent.removeClass("flex")
            parent.addClass("hidden")
        }, 300)
    })
    //add position 
    $(".position_form").submit( function(e){
        e.preventDefault()
        const position_input = $(this).find("input[name='position']")
        const submit_btn_text = $(this).find("button[type='submit']").text()
        const submit_btn = $(this).find("button[type='submit']")
        const icon = `<i style="font-size: 1.25rem;" class="fad fa-spin fa-spinner-third"></i>`
        submit_btn.prop("disabled", true)
        submit_btn.html(icon)
        $.ajax({
            url: 'add-position/',
            method: 'POST',
            cache: false, 
            processData: false,
            contentType: false,
            timout: 5000, 
            data: new FormData(this), 
            success: (res) => {
                if(res.done){
                    position_input.val('')
                    submit_btn.html(submit_btn_text)
                    toast.fire({
                        timer: 2000,
                        icon: 'success', 
                        title: res.msg
                    }).then( () => {
                        submit_btn.prop("disabled", false)
                    })
                }
                if(!res.done){
                    position_input.val('')
                    submit_btn.html(submit_btn_text)
                    toast.fire({
                        timer: 2000,
                        icon: 'info', 
                        title: res.msg
                    }).then( () => {
                        submit_btn.prop("disabled", false)
                    })
                }
            }, 
            error: (res) => {
                position_input.val('')
                submit_btn.html(submit_btn_text)
                toast.fire({
                    timer: 2000,
                    icon: 'error', 
                    title: `${res.status} ${res.statusText}`
                }).then( () => {
                    submit_btn.prop("disabled", false)
                })
            },
        })
    })
})