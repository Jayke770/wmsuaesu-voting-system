'use stirct'
$(document).ready( () => {
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
                <span>Fetching Voter ID's</span>
            </div>
        `, 
        duration: false,
        showAction: false
    })
    setTimeout(() => {
        ids()
    }, 2000) 
    async function ids() {
        try {
            const res = await fetchtimeout('ids/', {
                headers: {
                    'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
                },
                method: 'POST'
            })
            if(res.ok){
                const data = await res.text()
                $(".voters_id_all").find(".voters_id_skeleton").hide()
                $(".voters_id_all").append(data) 
                Snackbar.show({ 
                    text: "All Voter ID's Fetch",
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
                }
            })
        }
    }
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
    $(".add_voter_id_form").submit(function(e){
        e.preventDefault()
        const submit_btn_text = $(this).find("button[type='submit']").text()
        const icon = `<i style="font-size: 1.25rem;" class="fad fa-spin fa-spinner-third"></i>`
        let data = new FormData() 
        data.append('id', $(this).find("input[name='id']").val())
        $(this).find("button[type='submit']").text("Checking Voter ID...")
        $(this).find("button[type='submit']").prop('disabled', true)
        $.ajax({
            url: 'verify/', 
            method: 'POST', 
            cache: false, 
            processData: false, 
            contentType: false,
            data: data,
            success: (res) => {
                if(res.status){
                    $(this).find("button[type='submit']").html(icon)
                    $.ajax({
                        url: 'add-voter-id/',
                        method: 'POST',
                        cache: false,
                        contentType: false,
                        processData: false,
                        data: new FormData(this),
                        success: (res) => {
                            if (res.status) {
                                toast.fire({
                                    icon: 'success',
                                    timer: 2000,
                                    title: res.msg
                                }).then( () => {
                                    $(".reset_voter_id_form").click()
                                    $(this).find("button[type='submit']").prop('disabled', false)
                                    $(this).find("button[type='submit']").text(submit_btn_text)
                                    ids()
                                })
                            } else {
                                toast.fire({
                                    icon: 'error', 
                                    timer: 2000,
                                    title: res.msg
                                }).then( () => {
                                    $(this).find("button[type='submit']").prop('disabled', false)
                                    $(this).find("button[type='submit']").text(submit_btn_text)
                                })
                            }
                        },
                        error: (e) => {
                            if(e.statusText === 'timeout'){
                                toast.fire({
                                    icon: 'error', 
                                    timer: 1500,
                                    title: `Connection ${e.statusText}`
                                }).then( () => {
                                    $(this).find("button[type='submit']").text(submit_btn_text)
                                    $(this).find("button[type='submit']").prop('disabled', false)
                                })
                            } else {
                                toast.fire({
                                    icon: 'error', 
                                    timer: 1500,
                                    title: `${e.status} ${e.statusText}`
                                }).then( () => {
                                    $(this).find("button[type='submit']").text(submit_btn_text)
                                    $(this).find("button[type='submit']").prop('disabled', false)
                                })
                            }
                        }
                    })
                } else {
                    toast.fire({
                        icon: 'info', 
                        timer: 1500,
                        title: res.msg
                    }).then( () => {
                        $(this).find("button[type='submit']").text(submit_btn_text)
                        $(this).find("button[type='submit']").prop('disabled', false)
                    })
                }
            }, 
            error: (e) => {
                if(e.statusText === 'timeout'){
                    toast.fire({
                        icon: 'error', 
                        timer: 1500,
                        title: `Connection ${e.statusText}`
                    }).then( () => {
                        $(this).find("button[type='submit']").text(submit_btn_text)
                        $(this).find("button[type='submit']").prop('disabled', false)
                    })
                } else {
                    toast.fire({
                        icon: 'error', 
                        timer: 1500,
                        title: `${e.status} ${e.statusText}`
                    }).then( () => {
                        $(this).find("button[type='submit']").text(submit_btn_text)
                        $(this).find("button[type='submit']").prop('disabled', false)
                    })
                }
            }
        })
    })
    //delete voter id 
    $(".voters_id_all").delegate(".delete_voter_id", "click", function(e){
        e.preventDefault()
        Swal.fire({
            icon: 'question',
            title: 'Delete Voter ID ?', 
            showConfirmButton: true,
            showCancelButton: true,
            backdrop: true,
        }).then( (res) => {
            if(res.isConfirmed){
                Swal.fire({
                    title: 'Deleting', 
                    html: 'Please Wait',
                    showConfirmButton: false, 
                    backdrop: true,
                    willOpen: () => {
                        Swal.showLoading()
                        $.post("delete-voter-id/", {
                            id: $(this).attr("data")
                        }).done( (res) => {
                            if(res.status){
                                Swal.fire({
                                    icon: 'success', 
                                    title: res.msg, 
                                    backdrop: true, 
                                    allowOutsideClick: true
                                }).then( () => {
                                    //remove div containing the voter id 
                                    $(`div[data="${$(this).attr("data")}"]`).remove()
                                })
                            }
                            if(!res.status){
                                Swal.fire({
                                    icon: 'error', 
                                    title: res.msg,
                                    html: res.text, 
                                    backdrop: true, 
                                    allowOutsideClick: true
                                })
                            }
                        }).fail( (e) => {
                            Swal.fire({
                                icon: 'error', 
                                title: 'Connection error',
                                html: `${e.status} ${e.statusText}`,
                                backdrop: true, 
                                allowOutsideClick: false,
                            })
                        })
                    },
                    allowOutsideClick: () => !Swal.isLoading()
                })
            }
        })
    })
    $(".sort_voter_id").change(function(){
        if($(this).val().trim() !== ""){
            $.post("sort-voter-id/", {
                srt: $(this).val().trim()
            }, (res) => {
                if(res.status){
                    append(res.data)
                }
            })
        }
    })
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
        const icon = `<i style="font-size: 1.50rem; margin-right: 1rem; color: green;" class="fad fa-spin fa-spinner-third"></i>`
        let data = new FormData() 
        data.append("id", $(this).attr("data"))
        update_id = $(this).attr("data")
        //get voter id data 
        toast.fire({
            title: `${icon} Checking Voter ID...`, 
            willOpen: () => {
                $.ajax({
                    url: 'get-voter-id/', 
                    method: 'POST',
                    data: data, 
                    cache: false, 
                    processData: false, 
                    contentType: false,
                    success: (res) => {
                        if (res.status) {
                            setTimeout( () => {
                                toast.close()
                                $(".edit_voter_id_form").find('input[name="id"]').attr("placeholder", res.data.student_id)
                                $(".edit_form").addClass($(".edit_form").attr("animate-in"))
                                $(".popup_2").removeClass("hidden")
                                setTimeout(() => {
                                    $(".edit_form").removeClass($(".edit_form").attr("animate-in"))
                                }, 700)
                            }, 1000)
                        } else {
                            toast.fire({
                                icon: 'info', 
                                title: res.msg, 
                                timer: 1000,
                            })
                        }
                    }, 
                    error: (e) => {
                        if(e.statusText === 'timeout'){
                            toast.fire({
                                icon: 'error', 
                                timer: 1500,
                                title: `Connection ${e.statusText}`
                            })
                        } else {
                            toast.fire({
                                icon: 'error', 
                                timer: 1500,
                                title: `${e.status} ${e.statusText}`
                            })
                        }
                    },
                })
            },
        })
    })
    $(".edit_voter_id_form").submit(function(e){
        e.preventDefault() 
        $.ajax({
            url: 'update-voter-id/', 
            method: 'POST', 
            cache: false, 
            processData: false,
            contentType: false, 
            data: new FormData(this), 
            success: (res) => {
                if(res.status){
                    toast.fire({
                        icon: 'success', 
                        title: res.msg, 
                        timer: 1000
                    }).then( () => {
                        let data = new FormData() 
                        data.append("srt", "default")
                        $.ajax({
                            url: 'sort-voter-id/', 
                            method: 'POST', 
                            cache: false, 
                            processData: false, 
                            contentType: false, 
                            timer: 10000,
                            data: data, 
                            success: (res) => {
                                if(res.status){
                                    $(".edit_form").addClass($(".edit_form").attr("animate-out"))
                                    setTimeout( () => {
                                        $(".popup_2").addClass("hidden")
                                        $(".edit_form").removeClass($(".edit_form").attr("animate-out"))
                                        append(res.data) 
                                    }, 700)
                                } else {
                                    toast.fire({
                                        icon: 'info', 
                                        title: res.msg
                                    }).then( () => {
                                        $(this).find('button[type="reset"').click()
                                    })
                                }
                            }, 
                            error: (e) => {
                                if(e.statusText === 'timeout'){
                                    toast.fire({
                                        icon: 'error', 
                                        timer: 1500,
                                        title: `Connection ${e.statusText}`
                                    })
                                } else {
                                    toast.fire({
                                        icon: 'error', 
                                        timer: 1500,
                                        title: `${e.status} ${e.statusText}`
                                    })
                                }
                            }
                        })    
                    })
                } else {
                    toast.fire({
                        icon: 'info', 
                        timer: 1500,
                        title: res.msg
                    })
                }
            }, 
            error: (e) => {
                if(e.statusText === 'timeout'){
                    toast.fire({
                        icon: 'error', 
                        timer: 1500,
                        title: `Connection ${e.statusText}`
                    })
                } else {
                    toast.fire({
                        icon: 'error', 
                        timer: 1500,
                        title: `${e.status} ${e.statusText}`
                    })
                }
            }
        })
    })
    $(".close_edit_voter").click( () => {
        $(".edit_form").addClass($(".edit_form").attr("animate-out"))
        setTimeout( () => {
            $(".popup_2").addClass("hidden")
            $(".edit_form").removeClass($(".edit_form").attr("animate-out"))
        }, 700)
    })
    $(".popup_2").click( (e) => {
        if($(e.target).hasClass("edit_form")){
            $(".edit_form").addClass($(".edit_form").attr("animate-out"))
            setTimeout( () => {
                $(".popup_2").addClass("hidden")
                $(".edit_form").removeClass($(".edit_form").attr("animate-out"))
            }, 700)
        }
    })
    //functions
    const voter = {
        search: async (val) => {
            try {
                search_voter_id = true
                $(".voters_id_all").find(".voters_id_skeleton").show()
                $(".voters_id_all").find(".voter_ids").hide()
                let data = new FormData() 
                data.append("search", val)
                const req = await fetchtimeout('search-voter-id/', {
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
        }
    }
    function append(data){
        if(data.length != 0){
            $(".voters_id_all").html('')
            for(let i = 0; i < data.length; i++){
                let badge = "dark:bg-amber-700 bg-amber-600", text_badge = "Not Used"
                if(data[i].enabled){
                    badge = "dark:bg-green-700 bg-green-600"
                    text_badge = "Used"
                } 
                $(".voters_id_all").append(`
                <div style="animation-delay: ${i * .150}s;" data="${data[i]._id}" class="w-full animate__animated animate__fadeInUp p-3 bg-warmgray-100 dark:bg-[#161b22] dark:border dark:border-gray-800 rounded-lg cursor-pointer">
                    <div class="w-full">
                        <span class="st_id font-normal text-base dark:text-gray-300">${data[i].student_id}</span>
                        <div class="cr float-right font-medium text-fuchsia-600 dark:text-fuchsia-500">
                            <span course="${data.course}">...</span>
                            <span year="${data.year}">...</span>
                        </div>
                    </div>
                    <div class="mt-2 p-2">
                        <a data="${data[i]._id}" class="update_voter_id rpl text-lg rounded-md text-purple-600 dark:text-purple-500 p-2">
                            <i class="fas fa-edit"></i>
                        </a>
                        <a data="${data[i]._id}" class="delete_voter_id rpl text-lg rounded-md  text-rose-600 dark:text-rose-500 p-2">
                            <i class="fas fa-trash-alt"></i>
                        </a>
                        <span class="${badge} float-right text-sm mt-3 px-3 py-[2px] rounded-full text-gray-100">${text_badge}</span>
                    </div>
                </div>
            `)
            }
        } else {
            $(".voters_id_all").html(`
                <div class="empty_voter_id col-span-4 animate__animated animate__fadeInUp flex items-center justify-center transition-all">
                    <div class=" text-center w-[350px] md:mt-12 mt-36 py-9 bg-rose-500 dark:bg-darkBlue-secondary rounded-2xl cursor-pointer">
                        <span class="font-bold text-gray-50">Nothing To Fetch</span>
                    </div>
                </div>
            `)
        }
    }
})