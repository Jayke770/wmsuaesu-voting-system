$(document).ready( () => {
    //get the election starting time  
    let e_start = (new Date($("body").find(".e_time").attr("data")).getTime() / 1000), start = false
    let flipdown = new FlipDown(e_start, "e_time")
    flipdown.start()
    flipdown.ifEnded(() => {
        //check if the flipDown started attr is = to true 
        const status = $("body").find(".e_time").attr("started") 
        if(status !== "true"){
            alert("fasfs")
        }
    })
    //set the theme of flipdown 
    const theme = localStorage.getItem('theme') === "dark" ? true : false
    $("body").find(".e_time").removeClass(theme ? 'flipdown__theme-dark' : 'flipdown__theme-light')
    $("body").find(".e_time").addClass(theme ? 'flipdown__theme-light' : 'flipdown__theme-dark') 

    //open navigation 
    $(".e_nav").click( () => {
        const nav = $(".e_nav_main") 
        nav.addClass(nav.attr("animate-in"))
        nav.removeClass("xl:hidden") 
        setTimeout( () => {
            nav.removeClass(nav.attr("animate-in"))
        }, 300)
    })
    //close navigation 
    $(".cls_e_nav").click( () => {
        const nav = $(".e_nav_main") 
        nav.addClass(nav.attr("animate-out"))
        setTimeout( () => {
            nav.addClass("xl:hidden") 
            nav.removeClass(nav.attr("animate-out"))
        }, 300)
    })
})