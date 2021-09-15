$(document).ready(() => {
    //get the election starting time  
    let e_start = (new Date($("body").find("#e_time").attr("data")).getTime() / 1000), start = false
    let flipdown = new FlipDown(e_start, "e_time")
    flipdown.start()
    flipdown.ifEnded(() => {
        //check if the flipDown started attr is = to true 
        const status = $("body").find("#e_time").attr("started")
        if (status !== "true") {
            alert("fasfs")
        }
    })
    //set the theme of flipdown 
    const theme = localStorage.getItem('theme') === "dark" ? true : false
    $("body").find("#e_time").removeClass(theme ? 'flipdown__theme-dark' : 'flipdown__theme-light')
    $("body").find("#e_time").addClass(theme ? 'flipdown__theme-light' : 'flipdown__theme-dark')

    //open navigation 
    $(".e_nav").click(() => {
        const nav = $(".e_nav_main")
        nav.addClass(nav.attr("animate-in"))
        nav.removeClass("xl:hidden")
        setTimeout(() => {
            nav.removeClass(nav.attr("animate-in"))
        }, 300)
    })
    //close navigation 
    $(".cls_e_nav").click(() => {
        const nav = $(".e_nav_main")
        nav.addClass(nav.attr("animate-out"))
        setTimeout(() => {
            nav.addClass("xl:hidden")
            nav.removeClass(nav.attr("animate-out"))
        }, 300)
    })
    $(".election_btn").click(function (e) {
        e.preventDefault()
        const parent = $(`.${$(this).attr("data")}_`)
        const child = $(`.${$(this).attr("data")}_main`)
        parent.addClass("flex")
        child.addClass(child.attr("animate-in"))
        parent.removeClass("hidden")
        setTimeout(() => {
            child.removeClass(child.attr("animate-in"))
            voters("/control/elections/accepted-voters/", $("html").attr("data"))
        }, 700)
    })
    $(".e_ac").click( () => {
        voters("/control/elections/accepted-voters/", $("html").attr("data"))
    })
    $(".e_pend").click( () => {
        voters("/control/elections/pending-voters/", $("html").attr("data"))
    })
    //close voters pop up 
    $(".close_voters").click(() => {
        $(".voters_main").addClass($(".voters_main").attr("animate-out"))
        setTimeout(() => {
            $(".voters_").addClass("hidden")
            $(".voters_").removeClass("flex")
            $(".voters_main").removeClass($(".voters_main").attr("animate-out"))
        }, 500)
    })
    //courses 
    const courses = JSON.parse($(".e_main_content").find(".course").attr("default"))
    const year = JSON.parse($(".e_main_content").find(".year").attr("default"))
    const e_crs = $(".e_main_content").find(".course").attr("data").split(',')
    const e_yr = $(".e_main_content").find(".year").attr("data").split(',')
    for (let i = 0; i < e_crs.length; i++) {
        $(".e_main_content").find(".course").append(`
            <div style="border-color: rgba(126, 34, 206, 1)" class="border p-1 px-3 rounded-full cursor-pointer">
                <span class="text-gray-900 dark:text-gray-300 font-medium">${c(e_crs[i])}</span>
            </div> 
        `)
    }
    for (let i = 0; i < e_yr.length; i++) {
        $(".e_main_content").find(".year").append(`
            <div style="border-color: rgba(126, 34, 206, 1)" class="border p-1 px-3 rounded-full cursor-pointer">
                <span class="text-gray-900 dark:text-gray-300 font-medium">${y(e_yr[i])}</span>
            </div> 
        `)
    }
    //functions 
    function c(val) {
        for (let c = 0; c < courses.length; c++) {
            if (val === courses[c].id) {
                return courses[c].type
            }
        }
    }
    function y(val) {
        for (let c = 0; c < year.length; c++) {
            if (val === year[c].id) {
                return year[c].type
            }
        }
    }
    async function voters(link, id){
        const data = new FormData() 
        data.append("id", id)
        try {
            const ac = await fetchtimeout(link, {
                timeout: 10000, 
                method: 'POST', 
                body: data
            })
            if(ac.ok){
                const res = await ac.text() 
                $(".acp_voters").html(res)
            } else {
                throw new Error(`${ac.status} ${ac.statusText}`)
            }
        } catch (e) {
            console.warn(e.message)  
        }
    }
})