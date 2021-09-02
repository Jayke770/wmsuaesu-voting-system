"use strict"
$(document).ready(() => {
    //set timeout for all ajax requests 
    $.ajaxSetup({
        timeout: 10000,
    })
    //get course
    setTimeout(() => {
        cy()
    }, 2000)
    async function cy(){
        await $.post('course/')
            .done( (res) => {
                $(".c_list").find(".c_list_skeleton").remove()
                $(".c_list").html(res)
            }).fail( (e) => {
                //todo
            })
        await $.post('year/')
            .done( (res) => {
                $(".y_list").find(".c_list_skeleton").remove()
                $(".y_list").html(res)
            }).fail( (e) => {
                //todo
            })
    }
    $(".y").click(() => {
        const course = $(".c_list")
        const year = $(".y_list")
        if (year.hasClass("sm:hidden")) {
            year.removeClass("sm:hidden")
            course.addClass("sm:hidden")
        }
    })
    $(".c").click(() => {
        const course = $(".c_list")
        const year = $(".y_list")
        if (course.hasClass("sm:hidden")) {
            course.removeClass("sm:hidden")
            year.addClass("sm:hidden")
        }
    })
    $(".add_cy_btn").click(() => {
        const cy = $(".add_cy")
        const cy_main = $(".add_cy_main")
        cy_main.addClass(cy_main.attr("animate-in"))
        cy.addClass("flex")
        cy.removeClass("hidden")
        setTimeout(() => {
            cy_main.removeClass(cy_main.attr("animate-in"))
        }, 300)
    })
    $(".close_add_cy").click(() => {
        const cy = $(".add_cy")
        const cy_main = $(".add_cy_main")
        cy_main.addClass(cy_main.attr("animate-out"))
        setTimeout(() => {
            cy_main.removeClass(`${cy_main.attr("animate-out")} flex`)
            cy.addClass("hidden")
        }, 310)
    })
    $(".add_cy").click((e) => {
        if ($(e.target).hasClass("add_cy")) {
            const cy = $(".add_cy")
            const cy_main = $(".add_cy_main")
            cy_main.addClass(cy_main.attr("animate-out"))
            setTimeout(() => {
                cy_main.removeClass(`${cy_main.attr("animate-out")} flex`)
                cy.addClass("hidden")
            }, 310)
        }
    })
    $(".add_cy").submit(function (e) {
        e.preventDefault()
        const default_txt = $(this).find("button[type='submit']").text()
        const icon = `<i style="font-size: 1.25rem;" class="fad fa-spin fa-spinner-third"></i>`
        $.ajax({
            url: 'course&year/add-cy/',
            method: 'POST',
            cache: false,
            processData: false,
            contentType: false,
            timeout: 5000,
            data: new FormData(this),
            beforeSend: () => {
                $(this).find("button[type='submit']").prop("disabled", true)
                $(this).find("button[type='submit']").html(icon)
            },
            success: (res) => {
                $(this).find("button[type='submit']").prop("disabled", false)
                $(this).find("button[type='submit']").html(default_txt)
                if (res.status) {
                    toast.fire({
                        icon: 'success',
                        title: res.msg,
                        timer: 2000
                    }).then(() => {
                        $(this).find("button[type='reset']").click()
                        //append_new_cy(course || year)
                        if(res.type === "c&y"){
                            append_new_cy(res.data.year, "year")
                            append_new_cy(res.data.course, "course")
                        } else {
                            append_new_cy(res.data, res.type)
                        }
                    })
                } else {
                    toast.fire({
                        icon: 'info',
                        title: res.msg,
                        timer: 2000
                    })
                }
            },
            error: (e) => {
                $(this).find("button[type='submit']").prop("disabled", false)
                $(this).find("button[type='submit']").html(default_txt)
                if (e.statusText === 'timeout') {
                    toast.fire({
                        icon: 'error',
                        title: `Connection ${e.statusText}`,
                        timer: 2000
                    })
                } else {
                    toast.fire({
                        icon: 'error',
                        title: `${e.status} ${e.statusText}`,
                        timer: 2000
                    })
                }
            }
        })
    })
    $(".c_list").delegate(".del_c", "click", function (e) {
        e.preventDefault()
        const id = $(this).attr("data")
        let data = new FormData()
        data.append("id", $(this).attr("data"))
        Swal.fire({
            icon: 'question',
            title: "Delete Course?",
            backdrop: true,
            showCancelButton: true,
            allowOutsideClick: false,
        }).then((e) => {
            if (e.isConfirmed) {
                Swal.fire({
                    title: 'Deleting...',
                    backdrop: true,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    willOpen: () => {
                        Swal.showLoading()
                        $.ajax({
                            url: "course&year/del_c/",
                            method: "POST",
                            cache: false,
                            timeout: 5000,
                            processData: false,
                            contentType: false,
                            data: data,
                            success: (res) => {
                                if (res.status) {
                                    Swal.fire({
                                        icon: 'success',
                                        title: res.msg,
                                        backdrop: true,
                                        allowOutsideClick: false
                                    }).then( () => {
                                        $(`div[data=${id}]`).removeClass("animate__animated animate__fadeInUp")
                                        $(`div[data=${id}]`).addClass("animate__animated animate__fadeOutDown")
                                        setTimeout( () => {
                                            $(`div[data=${id}]`).remove()
                                        }, 1200)
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'info',
                                        title: res.msg,
                                        backdrop: true,
                                        allowOutsideClick: false
                                    })
                                }
                            },
                            error: (e) => {
                                if (e.statusText === 'timeout') {
                                    Swal.fire({
                                        icon: 'error',
                                        title: "Error",
                                        backdrop: true,
                                        allowOutsideClick: false,
                                        text: `Connection ${e.statusText}`,
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'error',
                                        title: "Error",
                                        backdrop: true,
                                        allowOutsideClick: false,
                                        text: `${e.status} ${e.statusText}`,
                                    })
                                }
                            }
                        })
                    }
                })
            }
        })
    })
    $(".c_list").delegate(".up_c", "click", function (e) {
        e.preventDefault() 
        const id = $(this).attr("data")
        let data = new FormData() 
        data.append("id", id)
        Swal.fire({
            icon: "info", 
            title: "Enter new course",
            showCancelButton: true,
            showConfirmButton: true,
            confirmButtonText: 'Update',
            input: "text",
            inputPlaceholder: 'Course',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
                autocomplete: 'off',
                required: 'true'
            }, 
            backdrop: true, 
            allowOutsideClick: false,
            inputValidator: (val) => {
                if(val){
                    data.append("new_course", val)
                    Swal.fire({
                        title: "Updating Course...", 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading()
                            $.ajax({
                                url: "course&year/up_c/", 
                                method: "POST", 
                                cache: false, 
                                processData: false, 
                                contentType: false, 
                                timeout: 5000,
                                data: data, 
                                success: (res) => {
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success',
                                            title: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        }).then( () => {
                                            $(`div[data=${id}]`).find(".type").text(val.toUpperCase())
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info',
                                            title: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                }, 
                                error: (e) => {
                                    if (e.statusText === 'timeout') {
                                        Swal.fire({
                                            icon: 'error',
                                            title: `Connection ${e.statusText}`,
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'error',
                                            title: `${e.status} ${e.statusText}`,
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                }
                            })
                        },
                    })
                } else {
                    Swal.fire({
                        icon: 'info',
                        title: "Please input a value",
                        backdrop: true, 
                        allowOutsideClick: false
                    })
                }
            },
        })
    })
    $(".y_list").delegate(".del_y", "click", function (e) {
        e.preventDefault()
        const id = $(this).attr("data")
        let data = new FormData()
        data.append("id", $(this).attr("data"))
        Swal.fire({
            icon: 'question',
            title: "Delete Year?",
            backdrop: true,
            showCancelButton: true,
            allowOutsideClick: false,
        }).then((e) => {
            if (e.isConfirmed) {
                Swal.fire({
                    title: 'Deleting...',
                    backdrop: true,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    willOpen: () => {
                        Swal.showLoading()
                        $.ajax({
                            url: "course&year/del_y/",
                            method: "POST",
                            cache: false,
                            timeout: 5000,
                            processData: false,
                            contentType: false,
                            data: data,
                            success: (res) => {
                                if (res.status) {
                                    Swal.fire({
                                        icon: 'success',
                                        title: res.msg,
                                        backdrop: true,
                                        allowOutsideClick: false
                                    }).then( () => {
                                        $(`div[data=${id}]`).removeClass("animate__animated animate__fadeInUp")
                                        $(`div[data=${id}]`).addClass("animate__animated animate__fadeOutDown")
                                        setTimeout( () => {
                                            $(`div[data=${id}]`).remove()
                                        }, 1200)
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'info',
                                        title: res.msg,
                                        backdrop: true,
                                        allowOutsideClick: false
                                    })
                                }
                            },
                            error: (e) => {
                                if (e.statusText === 'timeout') {
                                    Swal.fire({
                                        icon: 'error',
                                        title: "Error",
                                        backdrop: true,
                                        allowOutsideClick: false,
                                        text: `Connection ${e.statusText}`,
                                    })
                                } else {
                                    Swal.fire({
                                        icon: 'error',
                                        title: "Error",
                                        backdrop: true,
                                        allowOutsideClick: false,
                                        text: `${e.status} ${e.statusText}`,
                                    })
                                }
                            }
                        })
                    }
                })
            }
        })
    })
    $(".y_list").delegate(".up_y", "click", function (e) {
        e.preventDefault() 
        const id = $(this).attr("data")
        let data = new FormData() 
        data.append("id", id)
        Swal.fire({
            icon: "info", 
            title: "Enter new year",
            showCancelButton: true,
            showConfirmButton: true,
            confirmButtonText: `Update`,
            input: "text",
            inputPlaceholder: 'Year',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
                autocomplete: 'off',
                required: 'true'
            }, 
            backdrop: true, 
            allowOutsideClick: false,
            inputValidator: (val) => {
                if(val){
                    data.append("new_year", val)
                    Swal.fire({
                        title: "Updating...", 
                        backdrop: true, 
                        allowOutsideClick: false, 
                        showConfirmButton: false,
                        willOpen: () => {
                            Swal.showLoading()
                            $.ajax({
                                url: "course&year/up_y/", 
                                method: "POST", 
                                cache: false, 
                                processData: false, 
                                contentType: false, 
                                timeout: 5000,
                                data: data, 
                                success: (res) => {
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'success',
                                            title: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        }).then( () => {
                                            $(`div[data=${id}]`).find(".type").text(val)
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info',
                                            title: res.msg,
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                }, 
                                error: (e) => {
                                    if (e.statusText === 'timeout') {
                                        Swal.fire({
                                            icon: 'error',
                                            title: `Connection ${e.statusText}`,
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'error',
                                            title: `${e.status} ${e.statusText}`,
                                            backdrop: true, 
                                            allowOutsideClick: false
                                        })
                                    }
                                }
                            })
                        },
                    })
                } else {
                    Swal.fire({
                        icon: 'info',
                        title: "Please input a value",
                        backdrop: true, 
                        allowOutsideClick: false
                    })
                }
            },
        })
    })
    function append_new_cy(data, type) {
        console.log(data, type)
        const year_list = $(".y_list")
        const course_list = $(".c_list")
        if (type === "year") {
            //check if year list is not empty 
            if (year_list.find('.empty_list').length === 0) {
                //add new data in year list
                year_list.append(`
                    <div data="${data.id}" style="animation-delay: .150s;" class="rpl animate__animated animate__fadeInUp ms-800 group grid bg-gray-100 even:bg-gray-200 dark:bg-darkBlue-secondary dark:even:bg-darkBlue-secondary/40 rounded-md p-3 cursor-pointer">
                        <div class="grid grid-cols-2">
                            <p class="type font-semibold text-bluegray-900 text-base dark:text-gray-300">${data.type}</p>
                            <div class="transition-all animate__animated animate__fadeInLeft ms-300 hidden group-hover:flex flex-row justify-end items-center">
                                <a data="${data.id}" class="rpl up_y px-2 cursor-pointer text-green-600">
                                    <i class="fas fa-edit"></i>
                                </a>
                                <a data="${data.id}" class="rpl del_y px-2 cursor-pointer text-rose-600">
                                    <i class="fas fa-trash"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `)
            } else {
                //clean list first 
                year_list.html('')
                //add new data in year list
                year_list.append(`
                <div data="${data.id}" style="animation-delay:.150s;" class="rpl animate__animated animate__fadeInUp ms-800 group grid bg-gray-100 even:bg-gray-200 dark:bg-darkBlue-secondary dark:even:bg-darkBlue-secondary/40 rounded-md p-3 cursor-pointer">
                    <div class="grid grid-cols-2">
                        <p class="type font-semibold text-bluegray-900 text-base dark:text-gray-300">${data.type}</p>
                        <div class="transition-all animate__animated animate__fadeInLeft ms-300 hidden group-hover:flex flex-row justify-end items-center">
                            <a data="${data.id}" class="rpl up_y px-2 cursor-pointer text-green-600">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a data="${data.id}" class="rpl del_y px-2 cursor-pointer text-rose-600">
                                <i class="fas fa-trash"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `)
            }
        }

        if (type === "course") {
            //check if course list is not empty 
            if (course_list.find('.empty_list').length === 0) {
                course_list.append(`
                <div data="${data.id}" style="animation-delay: .150s;" class="rpl animate__animated animate__fadeInUp ms-800 group grid bg-gray-100 even:bg-gray-200 dark:bg-darkBlue-secondary dark:even:bg-darkBlue-secondary/40 rounded-md p-3 cursor-pointer">
                    <div class="grid grid-cols-2">
                        <p class="type font-semibold text-bluegray-900 text-base dark:text-gray-300">${data.type}</p>
                       <div class="transition-all animate__animated animate__fadeInLeft ms-300 hidden group-hover:flex flex-row justify-end items-center">
                            <a data="${data.id}" class="rpl up_c px-2 cursor-pointer text-green-600">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a data="${data.id}" class="rpl del_c px-2 cursor-pointer text-rose-600">
                                <i class="fas fa-trash"></i>
                            </a>
                        </div>
                    </div>
              </div>
            `)
            } else {
                //clean course list 
                course_list.html('')
                course_list.append(`
                <div data="${data.id}" style="animation-delay: .150s;" class="rpl animate__animated animate__fadeInUp ms-800 group grid bg-gray-100 even:bg-gray-200 dark:bg-darkBlue-secondary dark:even:bg-darkBlue-secondary/40 rounded-md p-3 cursor-pointer">
                    <div class="grid grid-cols-2">
                        <p class="type font-semibold text-bluegray-900 text-base dark:text-gray-300">${data.type}</p>
                       <div class="transition-all animate__animated animate__fadeInLeft ms-300 hidden group-hover:flex flex-row justify-end items-center">
                            <a data="${data.id}" class="rpl up_c px-2 cursor-pointer text-green-600">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a data="${data.id}" class="rpl del_c px-2 cursor-pointer text-rose-600">
                                <i class="fas fa-trash"></i>
                            </a>
                        </div>
                    </div>
              </div>
            `)
            }
        }
    }
})