'use stirct'
var req_id_number = false,
    add_voter_id = false, 
    search_voter_id = false, 
    update_id
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
        url: 'voter-id/verify/', 
        method: 'POST', 
        cache: false, 
        processData: false, 
        contentType: false,
        timeout: 10000,
        data: data,
        success: (res) => {
            if(res.status){
                $(this).find("button[type='submit']").html(icon)
                $.ajax({
                    url: 'voter-id/add-voter-id/',
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
                                append_voter_id(res.data)
                                $(this).find("button[type='submit']").prop('disabled', false)
                                $(this).find("button[type='submit']").text(submit_btn_text)
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
                    errror: (e) => {
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
                    $.post("voter-id/delete-voter-id/", {
                        id: $(this).attr("data")
                    }, (res) => {
                        if(res.status){
                            Swal.fire({
                                icon: 'success', 
                                title: res.msg, 
                                backdrop: true, 
                                allowOutsideClick: true
                            }).then( () => {
                                //remove div containing the voter id 
                                $(`div[data="${res.id_deleted}"]`).remove()
                            })
                        }
                        if(!res.status){
                            Swal.fire({
                                icon: 'error', 
                                title: res.msg, 
                                backdrop: true, 
                                allowOutsideClick: true
                            })
                        }
                    })
                },
                allowOutsideClick: () => !Swal.isLoading()
            })
        }
    })
})
$(".sort_voter_id").change(function(){
    if($(this).val().trim() !== ""){
        $.post("voter-id/sort-voter-id/", {
            data: $(this).val().trim()
        }, (res) => {
            if(res.status){
                append_sort_voter_id(res.data)
            }
        })
    }
})
$(".search_voter_id").keyup(function(){
    if($(this).val().trim() !== ""){
        if(!search_voter_id){
            search_voter_id = true
            $.post("voter-id/search-voter-id/", {
                data: $(this).val().trim()
            }, (res, status) => {
                if(res.status){
                    append_sort_voter_id(res.data)
                    search_voter_id = false
                }
            }).fail( (e) => {
                Swal.fire({
                    icon: 'info',
                    title: e.statusText,
                    html: `Status Code : ${e.status}`
                })
            })
        }
    }
})
$(".voters_id_all").delegate(".update_voter_id", "click", function(e) {
    e.preventDefault() 
    const icon = `<i style="font-size: 1.50rem; margin-right: 1rem; color: green;" class="fad fa-spin fa-spinner-third"></i>`
    let data = new FormData() 
    data.append("data", $(this).attr("data"))
    update_id = $(this).attr("data")
    //get voter id data 
    toast.fire({
        title: `${icon} Checking Voter ID...`, 
        willOpen: () => {
            $.ajax({
                url: 'voter-id/get-voter-id/', 
                method: 'POST',
                data: data, 
                cache: false, 
                timeout: 10000,
                processData: false, 
                contentType: false,
                success: (res) => {
                    if (res.status) {
                        setTimeout( () => {
                            toast.close()
                            $(".edit_voter_id_form").find('input[name="id"]').attr("placeholder", res.data[0].student_id)
                            $(".edit_voter_id_form").find('input[name="course"]').attr("placeholder", res.data[0].course)
                            $(".edit_voter_id_form").find('input[name="year"]').attr("placeholder", res.data[0].year)
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
        url: 'voter-id/update-voter-id/', 
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
                    data.append("data", "default")
                    $.ajax({
                        url: 'voter-id/sort-voter-id/', 
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
                                    append_sort_voter_id(res.data) 
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
function append_sort_voter_id(data){
    //remove all voter id 
    $(".voters_id_all").html("")
    if(data.length == 0){
        empty()
    }
    else{
        for(let i = 0; i < data.length; i++){
            let delay = 0
            append_voter_id(data[i], `${i * .100}s`)
        }
    }
}
function empty(){
    $(".voters_id_all").append(`
        <div class="empty animate__animated animate__fadeInUp ms-900 w-full p-3 dark:text-gray-200 text-center bg-gray-50 dark:bg-darkBlue-secondary dark:border dark:border-gray-700 rounded-lg cursor-pointer">
            Nothing to fetch
        </div>
    `)
    setTimeout( () => {
        $(".empty").removeClass("animate__animated animate__fadeInUp")
    }, 900)
}
function append_voter_id(data, delay){
    var badge, text
    if(data.enabled){
        badge = 'dark:bg-green-700 bg-green-600'
        text = "Used"
    }
    else{
        badge = "dark:bg-amber-700 bg-amber-600"
        text = "Not Used"
    }
    $(".voters_id_all").append(`
        <div style="animation-delay: ${delay};" data="${data._id}" class="w-full animate__animated animate__fadeInUp p-3 bg-warmgray-100 dark:bg-[#161b22] dark:border dark:border-gray-700 rounded-lg cursor-pointer">
            <div class="w-full">
                <span class="st_id font-normal text-base dark:text-gray-300">${data.student_id}</span>
                <span class="cr float-right font-medium text-fuchsia-600 dark:text-fuchsia-500">${data.course} ${data.year}</span>
            </div>
            <div class="mt-2 p-2">
                <a data="${data._id}" class="update_voter_id rpl text-lg rounded-md text-purple-600 dark:text-purple-500 p-2">
                    <i class="fas fa-edit"></i>
                </a>
                <a data="${data._id}" class="delete_voter_id rpl text-lg rounded-md  text-rose-600 dark:text-rose-500 p-2">
                    <i class="fas fa-trash-alt"></i>
                </a>
                <span class="${badge} float-right text-sm mt-3 px-3 py-[2px] rounded-full text-gray-100">${text}</span>
            </div>
        </div>
    `)
}