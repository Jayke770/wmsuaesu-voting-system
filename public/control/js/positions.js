"use strict"
$(document).ready(function () {
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
                <span>Fetching Positions</span>
            </div>
        `, 
        duration: false,
        showAction: false
    })
    setTimeout( () => {
        pos_all()
    }, 2000)
    async function pos_all(){
        try {
            const res = await fetchtimeout('pos/', {
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                method: 'POST'
            })
            if(res.ok){
                const data = await res.text()
                $(".positions_all").find(".pos_skeleton").remove() 
                $(".positions_all").html(data)
                Snackbar.show({ 
                    text: 'All Positions Fetch',
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
                    pos_all()
                }
            })
        }
    }

    $(".add_pos_btn").click(() => {
        const parent = $(".add_position")
        const child = $(".add_position_main")
        parent.removeClass("hidden")
        parent.addClass("flex")
        child.addClass(child.attr("animate-in"))
        setTimeout(() => {
            child.removeClass(child.attr("animate-in"))
            $(".total_pos").text($(".pos").length)
        }, 400)
    })
    $(".close_add_pos").click(() => {
        const parent = $(".add_position")
        const child = $(".add_position_main")
        child.addClass(child.attr("animate-out"))
        setTimeout(() => {
            child.removeClass(child.attr("animate-out"))
            parent.removeClass("flex")
            parent.addClass("hidden")
        }, 300)
    })
    $(".add_position").click(function (e) {
        const parent = $(".add_position")
        const child = $(".add_position_main")
        if ($(e.target).hasClass("add_position")) {
            child.addClass(child.attr("animate-out"))
            setTimeout(() => {
                child.removeClass(child.attr("animate-out"))
                parent.removeClass("flex")
                parent.addClass("hidden")
            }, 300)
        }
    })
    //add position 
    $(".position_form").submit(function (e) {
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
                if (res.done) {
                    position_input.val('')
                    submit_btn.html(submit_btn_text)
                    toast.fire({
                        timer: 2000,
                        icon: 'success',
                        title: res.msg
                    }).then(() => {
                        submit_btn.prop("disabled", false)
                        append_pos(res.data)
                        $(".total_pos").text($(".pos").length)
                    })
                }
                if (!res.done) {
                    position_input.val('')
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
                position_input.val('')
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
    //delete positions 
    $(".positions_all").delegate(".del_pos", "click", function (e) {
        e.preventDefault()
        const id = $(this).attr("data")
        let data = new FormData()
        data.append("id", id)
        Swal.fire({
            icon: 'question',
            title: 'Delete Position ?',
            html: 'Deleting Positions can cause problem in other elections',
            backdrop: true,
            showCancelButton: true,
            allowOutsideClick: false,
        }).then((res) => {
            if (res.isConfirmed) {
                Swal.fire({
                    title: 'Please wait...',
                    html: 'Deleting position',
                    backdrop: true,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    willOpen: () => {
                        Swal.showLoading()
                        $.ajax({
                            url: 'delete-position/',
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
    //update positions 
    $(".positions_all").delegate(".up_pos", "click", function (e) {
        e.preventDefault()
        const id = $(this).attr("data")
        let data = new FormData()
        Swal.fire({
            icon: 'info',
            title: 'Enter new position',
            showCancelButton: true,
            backdrop: true,
            allowOutsideClick: false,
            input: 'text',
            inputPlaceholder: 'Position',
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
                        html: 'Updating position...',
                        backdrop: true,
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading()
                            $.ajax({
                                url: 'update-position/',
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
                        title: 'Position cannot be empty!',
                        backdrop: true,
                        allowOutsideClick: false
                    })
                }
            },
        })
    })
    function append_pos(data) {
        const positions = $(".positions_all")
        $(".empty_pos").remove()
        const element = `
            <div data="${data.id}" class="pos dark:bg-darkBlue-secondary sm:last:mb-4 group animate__animated animate__fadeInUp p-3 grid grid-cols-2 bg-gray-100 rounded-xl cursor-pointe">
                <div>
                    <span class="text-bluegray-900 dark:text-gray-300 text-base font-normal break-all">${data.type}</span>
                </div>
                <div class="hidden group-hover:flex animate__animated animate__fadeInLeft ms-200 transition-all justify-end items-center gap-1">
                    <a data="${data.id}" class="rpl px-2 up_pos cursor-pointer text-green-600">
                        <i class="fas fa-edit"></i>
                    </a>
                    <a data="${data.id}" class="rpl px-2 del_pos cursor-pointer text-rose-600">
                        <i class="fas fa-trash"></i>
                    </a>
                </div>
            </div>`
        positions.append(element)
    }
})