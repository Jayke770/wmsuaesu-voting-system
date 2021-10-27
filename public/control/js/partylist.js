$(document).ready(() => {
    //set timeout for all ajax requests 
    $.ajaxSetup({
        timeout: 30000,
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    })
    Snackbar.show({ 
        text: `
            <div class="flex justify-center items-center gap-2"> 
                <i style="font-size: 1.25rem;" class="fad animate-spin fa-spinner-third"></i>
                <span>Fetching Partylists</span>
            </div>
        `, 
        duration: false,
        showAction: false
    })
    setTimeout( () => {
        pty()
    }, 2000)
    async function pty() {
        try {
            const res = await fetchtimeout('pty/', {
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                }, 
                method: 'POST'
            })
            if(res.ok){
                const data = await res.text() 
                $(".pty_all").find(".pty_skeleton").remove() 
                $(".pty_all").html(data)
                Snackbar.show({ 
                    text: "All Partylists Fetch",
                    duration: 3000, 
                    actionText: 'Okay'
                })
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
                    pty()
                }
            })
        }
    }
    $(".add_pty_btn").click(function (e) {
        e.preventDefault()
        const parent = $(".add_pty")
        const main = $(".add_pty_main")
        $(".total_pty").text($(".pty").length)
        parent.addClass("flex")
        main.addClass(main.attr("animate-in"))
        parent.removeClass("hidden")
        setTimeout(() => {
            main.removeClass(main.attr("animate-in"))
        }, 500)
    })
    $(".close_add_pty").click(function (e) {
        e.preventDefault()
        const parent = $(".add_pty")
        const main = $(".add_pty_main")
        main.addClass(main.attr("animate-out"))
        setTimeout(() => {
            parent.addClass("hidden")
            parent.removeClass("flex")
            main.removeClass(main.attr("animate-out"))
        }, 500)
    })
    $(".add_pty").click(function (e) {
        const parent = $(".add_pty")
        const main = $(".add_pty_main")
        if ($(e.target).hasClass("add_pty")) {
            main.addClass(main.attr("animate-out"))
            setTimeout(() => {
                main.removeClass(main.attr("animate-out"))
                parent.removeClass("flex")
                parent.addClass("hidden")
            }, 300)
        }
    })
    $(".pty_form").submit(function (e) {
        e.preventDefault()
        const pty_input = $(this).find("input[name='partylist']")
        const submit_btn_text = $(this).find("button[type='submit']").text()
        const submit_btn = $(this).find("button[type='submit']")
        const icon = `<i style="font-size: 1.25rem;" class="fad fa-spin fa-spinner-third"></i>`
        submit_btn.prop("disabled", true)
        submit_btn.html(icon)
        $.ajax({
            url: 'add-partylist/',
            method: 'POST',
            cache: false,
            processData: false,
            contentType: false,
            timout: 5000,
            data: new FormData(this),
            success: (res) => {
                if (res.done) {
                    pty_input.val('')
                    submit_btn.html(submit_btn_text)
                    toast.fire({
                        timer: 2000,
                        icon: 'success',
                        title: res.msg
                    }).then(async () => {
                        submit_btn.prop("disabled", false)
                        await pty()
                        $(".total_pty").text($(".pty").length)
                    })
                }
                if (!res.done) {
                    pty_input.val('')
                    submit_btn.html(submit_btn_text)
                    toast.fire({
                        timer: 2000,
                        icon: 'info',
                        title: res.msg
                    }).then(() => {
                        submit_btn.prop("disabled", false)
                    })
                }
            },
            error: (res) => {
                pty_input.val('')
                submit_btn.html(submit_btn_text)
                toast.fire({
                    timer: 2000,
                    icon: 'error',
                    title: `${res.status} ${res.statusText}`
                }).then(() => {
                    submit_btn.prop("disabled", false)
                })
            },
        })
    })
    $(".pty_all").delegate(".del_pty", "click", function (e) {
        e.preventDefault()
        const id = $(this).attr("data")
        let data = new FormData()
        data.append("id", id)
        Swal.fire({
            icon: 'question',
            title: 'Delete Partylist ?',
            html: 'Deleting Partylist can cause problem in other elections',
            backdrop: true,
            showCancelButton: true,
            allowOutsideClick: false,
        }).then((res) => {
            if (res.isConfirmed) {
                Swal.fire({
                    title: 'Please wait...',
                    html: 'Deleting partylist',
                    backdrop: true,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    willOpen: () => {
                        Swal.showLoading()
                        $.ajax({
                            url: 'delete-partylist/',
                            method: 'POST',
                            cache: false,
                            processData: false,
                            contentType: false,
                            timeout: 10000,
                            data: data,
                            success: (res) => {
                                if (res.deleted) {
                                    Swal.fire({
                                        icon: 'success',
                                        title: res.msg,
                                        backdrop: true,
                                        allowOutsideClick: false,
                                    }).then(() => {
                                        $(`div[data=${id}]`).remove()
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'info',
                                        title: res.msg,
                                        backdrop: true,
                                        allowOutsideClick: false,
                                    })
                                }
                            },
                            error: (res) => {
                                if (res.statusText === 'timeout') {
                                    Swal.fire({
                                        icon: 'error',
                                        title: `Connection ${res.statusText}`,
                                        backdrop: true,
                                        allowOutsideClick: false,
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'error',
                                        title: 'Error',
                                        html: `${res.status} ${res.statusText}`,
                                        backdrop: true,
                                        allowOutsideClick: false,
                                    })
                                }
                            }
                        })
                    },
                })
            }
        })
    })
    $(".pty_all").delegate(".up_pty", "click", function (e) {
        e.preventDefault()
        const id = $(this).attr("data")
        let data = new FormData()
        Swal.fire({
            icon: 'info',
            title: 'Enter new partylist',
            showCancelButton: true,
            backdrop: true,
            allowOutsideClick: false,
            input: 'text',
            inputPlaceholder: 'Partylist',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
                autocomplete: 'off',
                required: 'true'
            },
            inputValidator: (val) => {
                if (val) {
                    data.append("id", id)
                    data.append("type", val)
                    Swal.fire({
                        title: 'Please wait',
                        html: 'Updating partylist...',
                        backdrop: true,
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading()
                            $.ajax({
                                url: 'update-partylist/',
                                method: 'POST',
                                cache: false,
                                processData: false,
                                contentType: false,
                                timeout: 10000,
                                data: data,
                                success: (res) => {
                                    if (res.updated) {
                                        Swal.fire({
                                            icon: 'success',
                                            title: res.msg,
                                            backdrop: true,
                                            allowOutsideClick: false
                                        }).then(() => {
                                            $(`div[data=${id}]`).find('span').text(val)
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'error',
                                            title: res.msg,
                                            backdrop: true,
                                            allowOutsideClick: false
                                        })
                                    }
                                },
                                error: (res) => {
                                    if (res.statusText === 'timeout') {
                                        Swal.fire({
                                            icon: 'error',
                                            title: `Connection ${res.statusText}`,
                                            backdrop: true,
                                            allowOutsideClick: false,
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'error',
                                            title: 'Connection Error',
                                            html: `${res.status} ${res.statusText}`,
                                            backdrop: true,
                                            allowOutsideClick: false,
                                        })
                                    }
                                }
                            })
                        },
                    })
                }
                else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Partylist cannot be empty!',
                        backdrop: true,
                        allowOutsideClick: false
                    })
                }
            },
        })
    })
})