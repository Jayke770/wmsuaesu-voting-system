$(document).ready( () => {
    //open navigation 
    $(".open_nav").click( () => {
        const parent = $(".nav") 
        const child = $(".nav_main") 
        child.addClass(child.attr("animate-in")) 
        parent.removeClass("hidden") 
        setTimeout( () => {
            child.removeClass(child.attr("animate-in")) 
        }, 300)
    }) 
    //close navigation 
    $(".cls_nav").click( () => {
        const parent = $(".nav") 
        const child = $(".nav_main") 
        child.addClass(child.attr("animate-out")) 
        setTimeout( () => {
            parent.addClass("hidden") 
            child.removeClass(child.attr("animate-out")) 
        }, 300)
    })
    $(".nav").click( function(e) {
        if($(e.target).hasClass("nav")){
            const parent = $(".nav") 
            const child = $(".nav_main") 
            child.addClass(child.attr("animate-out")) 
            setTimeout( () => {
                parent.addClass("hidden") 
                child.removeClass(child.attr("animate-out")) 
            }, 300)
        }
    })
})