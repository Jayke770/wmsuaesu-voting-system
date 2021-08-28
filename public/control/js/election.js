'use strict'
$(document).ready(() => {
    let req = false, courses = [], year = [], partylist = []
    //detect locations hash 
    const loc = location.hash
    if(loc){
        if(!req){
            req = true
            $.ajax({
                url: `${loc.replace("#", "")}/`, 
                method: 'POST',
                timeout: 5000, 
                success: (res) => {
                    $(".main").fadeOut(10)
                    $(".loader").html(res)
                    location.hash = loc
                    req = false
                }, 
                error: (e) => {
                    req = false
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
        } else {
            toast.fire({
                icon: 'info',
                title: 'Please wait',
                timer: 2000
            })
        }
    } else {
        $(".main").fadeIn(500)
    }
    $(".open_settings").click(() => {
        const settings_parent = $(".settings")
        const settings_main = $(".settings_main")
        settings_parent.addClass("flex")
        settings_main.addClass(settings_main.attr("animate-in"))
        settings_parent.removeClass("hidden")
        setTimeout(() => {
            settings_main.removeClass(settings_main.attr("animate-in"))
        }, 500)
    })
    $(".settings").click(function (e) {
        const settings_parent = $(".settings")
        const settings_main = $(".settings_main")
        if ($(e.target).hasClass("settings")) {
            settings_main.addClass(settings_main.attr("animate-out"))
            setTimeout(() => {
                settings_parent.addClass("hidden")
                settings_parent.removeClass("flex")
                settings_main.removeClass(settings_main.attr("animate-out"))
            }, 500)
        }
    })
    $(".close_settings").click(() => {
        const settings_parent = $(".settings")
        const settings_main = $(".settings_main")
        settings_main.addClass(settings_main.attr("animate-out"))
        setTimeout(() => {
            settings_parent.addClass("hidden")
            settings_parent.removeClass("flex")
            settings_main.removeClass(settings_main.attr("animate-out"))
        }, 500)
    })
    $(".settings_btn").click( function(e){
        e.preventDefault() 
        const default_icon = $(this).find(".ic").html()
        const title = $(this).text()
        const icon = `<i style="font-size: 1.25rem;" class="fad fa-spin fa-spinner-third"></i>`
        $(this).find(".ic").html(icon)
        if(!req){
            req = true
            $.ajax({
                url: $(this).attr("data"), 
                method: 'POST',
                timeout: 5000, 
                success: (res) => {
                    $(".close_settings").click()
                    $(this).find(".ic").html(default_icon)
                    $(".main").fadeOut(10)
                    $(".loader").html(res)
                    location.hash = $(this).attr("data").replace("/", "")
                    req = false
                }, 
                error: (e) => {
                    req = false
                    $(this).find(".ic").html(default_icon)
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
        } else {
            toast.fire({
                icon: 'info',
                title: 'Please wait',
                timer: 2000
            })
        }
    })
    $(".loader").delegate(".return_main", "click", () => {
        window.location.assign('')
    })
    //create election
    $(".create_election_btn").click( function(e) {
        e.preventDefault()
        const parent = $(".create_election")
        const main = $(".create_election_main")
        parent.addClass("flex") 
        main.addClass(main.attr("animate-in"))
        parent.removeClass("hidden")
        setTimeout( () => {
            main.removeClass(main.attr("animate-in"))
        }, 500)
    })
    $(".close_e_create").click( function(e) {
        e.preventDefault() 
        const parent = $(".create_election")
        const main = $(".create_election_main") 
        main.addClass(main.attr("animate-out")) 
        setTimeout( () => {
            parent.addClass("hidden")
            parent.removeClass("flex")
            main.removeClass(main.attr("animate-out")) 
        }, 501)
    })
    $(".dt_picker").flatpickr({
        disableMobile: "true", 
        minDate: "today",
        enableTime: true,
        dateFormat: "Y-m-d h:i K",
    })
    $(".c_list_e").click( () => {
        const courses = $(".courses")
        const year = $(".year")
        if(courses.hasClass("md:hidden")){
            courses.removeClass("md:hidden")
            year.addClass("md:hidden")
        }
    })
    $(".y_list_e").click( () => {
        const courses = $(".courses")
        const year = $(".year")
        if(year.hasClass("md:hidden")){
            year.removeClass("md:hidden")
            courses.addClass("md:hidden")
        }
    })
    $(".create_e_btn").click( function(e){
        e.preventDefault() 
        $(".e_info, .e_courses, .e_positions, .e_partylist").hide() 
        $(".create_e_btn").removeClass("active-e-btn")
        $(this).addClass("active-e-btn")
        $($(this).attr("data")).show()
    })
    //when course list is clicked 
    $(".course_select").click(function() {
        const icon = `<i class="fad fa-check-circle"></i>`
        if(!$(this).hasClass("active-b-green")){
            //check if courses array is  empty 
            if(courses.length === 0) {
                //if = to 0 push new item
                courses.push($(this).attr("data"))
                $(this).addClass("active-b-green")
                $(".courses").find("input[name='courses']").val(courses)
                $(this).find(".course_select_ic").html(icon)
            } else {
               //if the courses array is not equal to 0 
               //check if the selected item is not equal to the courses array 
               for(let i = 0; i < courses.length; i++){
                   //if not = push new item
                   if($(this).attr("data") != courses[i]){
                       courses.push($(this).attr("data"))
                       $(this).addClass("active-b-green")
                       $(".courses").find("input[name='courses']").val(courses)
                       $(this).find(".course_select_ic").html(icon)
                       break
                   } else {
                       courses.splice(i, 1)
                       $(this).removeClass("active-b-green")
                       $(".courses").find("input[name='courses']").val(courses)
                       $(this).find(".course_select_ic").html('')
                       break
                   }
               }
            }
        } else {
            //remove the item selected to courses array 
            for(let i = 0; i < courses.length; i++){
                if($(this).attr("data") == courses[i]){
                    courses.splice(i, 1)
                    $(this).removeClass("active-b-green")
                    $(".courses").find("input[name='courses']").val(courses)
                    $(this).find(".course_select_ic").html('')
                    break
                }
            }
        }
    })
    //when year list is clicked 
    $(".year_select").click(function() {
        const icon = `<i class="fad fa-check-circle"></i>`
        if(!$(this).hasClass("active-b-green")){
            //check if year array is  empty 
            if(year.length === 0) {
                //if = to 0 push new item
                year.push($(this).attr("data"))
                $(this).addClass("active-b-green")
                $(".year").find("input[name='year']").val(year)
                $(this).find(".year_select_ic").html(icon)
            } else {
               //if the year array is not equal to 0 
               //check if the selected item is not equal to the year array 
               for(let i = 0; i < year.length; i++){
                   //if not = push new item
                   if($(this).attr("data") != year[i]){
                       year.push($(this).attr("data"))
                       $(this).addClass("active-b-green")
                       $(".year").find("input[name='year']").val(year)
                       $(this).find(".year_select_ic").html(icon)
                       break
                   } else {
                       year.splice(i, 1)
                       $(this).removeClass("active-b-green")
                       $(".year").find("input[name='year']").val(year)
                       $(this).find(".year_select_ic").html('')
                       break
                   }
               }
            }
        } else {
            //remove the item selected to year array 
            for(let i = 0; i < year.length; i++){
                if($(this).attr("data") == year[i]){
                    year.splice(i, 1)
                    $(this).removeClass("active-b-green")
                    $(".year").find("input[name='year']").val(year)
                    $(this).find(".year_select_ic").html('')
                    break
                }
            }
        }
    })
    //when partylist is clicked
    $(".partylist_select").click(function(){
        const icon = `<i class="fad fa-check-circle"></i>`
        if(!$(this).hasClass("active-b-green")){
            //check if partylist array if = to 0 
            if(partylist.length === 0){
                partylist.push($(this).attr("data"))
                $(this).addClass("active-b-green")
                $(".partylists").find("input[name='partylists']").val(partylist)
                $(this).find(".partylist_select_ic").html(icon)
            } else {
                //if the partylist array is not equal to 0 
               //check if the selected item is not equal to the partylist array 
               for(let i = 0; i < partylist.length; i++){
                //if not = push new item
                if($(this).attr("data") != partylist[i]){
                    partylist.push($(this).attr("data"))
                    $(this).addClass("active-b-green")
                    $(".partylists").find("input[name='partylists']").val(partylist)
                    $(this).find(".partylist_select_ic").html(icon)
                    break
                } else {
                    partylist.splice(i, 1)
                    $(this).removeClass("active-b-green")
                    $(".partylists").find("input[name='partylists']").val(partylist)
                    $(this).find(".partylist_select_ic").html('')
                    break
                }
            }
            }
        } else {
            //remove the item selected to partylist array 
            for(let i = 0; i < partylist.length; i++){
                if($(this).attr("data") == partylist[i]){
                    partylist.splice(i, 1)
                    $(this).removeClass("active-b-green")
                    $(".partylists").find("input[name='partylists']").val(partylist)
                    $(this).find(".partylist_select_ic").html('')
                    break
                }
            }
        }
    })
    //when form is submitted 
    $(".create_election_form").submit(function(e) {
        e.preventDefault() 
        $.ajax({
            url: 'p/',
            method: 'POST',
            cache: false,
            processData: false,
            contentType: false,
            timout: 5000,
            data: new FormData(this), 
            success: (res) => {
                console.log('fas')
            }
        })
    })
})