"use strict"
$(document).ready(() => {
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
            url: 'add-cy/',
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
                        //append_new_cy(course, year)
                        append_new_cy(res.data[0], res.data[1])
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
    function append_new_cy(course, year) {
        const year_list = $(".y_list")
        const course_list = $(".c_list")
        //check if year list is not empty 
        if (year_list.find('.empty_list').length === 0) {
            //add new data in year list
            year_list.append(`
                <div data="${year.id}" style="animation-delay: .150s;" class="rpl animate__animated animate__fadeInUp ms-800 group grid bg-gray-100 even:bg-gray-200 dark:bg-darkBlue-secondary dark:even:bg-darkBlue-secondary/40 rounded-md p-3 cursor-pointer">
                    <div class="grid grid-cols-2">
                        <p class="font-semibold text-bluegray-900 text-base dark:text-gray-300">${year.type}</p>
                        <div class="transition-all animate__animated animate__fadeInLeft ms-300 hidden group-hover:flex flex-row justify-end items-center">
                            <a data="${year.id}" class="rpl px-2 cursor-pointer text-green-600">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a data="${year.id}" class="rpl px-2 cursor-pointer text-rose-600">
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
             <div data="${year.id}" style="animation-delay:.150s;" class="rpl animate__animated animate__fadeInUp ms-800 group grid bg-gray-100 even:bg-gray-200 dark:bg-darkBlue-secondary dark:even:bg-darkBlue-secondary/40 rounded-md p-3 cursor-pointer">
                 <div class="grid grid-cols-2">
                     <p class="font-semibold text-bluegray-900 text-base dark:text-gray-300">${year.type}</p>
                     <div class="transition-all animate__animated animate__fadeInLeft ms-300 hidden group-hover:flex flex-row justify-end items-center">
                         <a data="${year.id}" class="rpl px-2 cursor-pointer text-green-600">
                             <i class="fas fa-edit"></i>
                         </a>
                         <a data="${year.id}" class="rpl px-2 cursor-pointer text-rose-600">
                             <i class="fas fa-trash"></i>
                         </a>
                     </div>
                 </div>
             </div>
         `)
        }

        //check if course list is not empty 
        if (course_list.find('.empty_list').length === 0) {
            course_list.append(`
                <div data="${course.id}" style="animation-delay: .150s;" class="rpl animate__animated animate__fadeInUp ms-800 group grid bg-gray-100 even:bg-gray-200 dark:bg-darkBlue-secondary dark:even:bg-darkBlue-secondary/40 rounded-md p-3 cursor-pointer">
                    <div class="grid grid-cols-2">
                        <p class="font-semibold text-bluegray-900 text-base dark:text-gray-300">${course.type}</p>
                       <div class="transition-all animate__animated animate__fadeInLeft ms-300 hidden group-hover:flex flex-row justify-end items-center">
                            <a data="${course.id}" class="rpl px-2 cursor-pointer text-green-600">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a data="${course.id}" class="rpl px-2 cursor-pointer text-rose-600">
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
                <div data="${course.id}" style="animation-delay: .150s;" class="rpl animate__animated animate__fadeInUp ms-800 group grid bg-gray-100 even:bg-gray-200 dark:bg-darkBlue-secondary dark:even:bg-darkBlue-secondary/40 rounded-md p-3 cursor-pointer">
                    <div class="grid grid-cols-2">
                        <p class="font-semibold text-bluegray-900 text-base dark:text-gray-300">${course.type}</p>
                       <div class="transition-all animate__animated animate__fadeInLeft ms-300 hidden group-hover:flex flex-row justify-end items-center">
                            <a data="${course.id}" class="rpl px-2 cursor-pointer text-green-600">
                                <i class="fas fa-edit"></i>
                            </a>
                            <a data="${course.id}" class="rpl px-2 cursor-pointer text-rose-600">
                                <i class="fas fa-trash"></i>
                            </a>
                        </div>
                    </div>
              </div>
            `)
        }
    }
})