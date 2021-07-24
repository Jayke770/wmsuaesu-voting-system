'use strict'
/*election nav*/
$(".e_nav").click(() => {
    $(".e_nav_main").removeClass("xl:hidden")
    setTimeout(() => {
        $(".e_nav_main").removeClass("animate__slideInRight")
    }, 305)
})
$(".cls_e_nav").click(() => {
    $(".e_nav_main").removeClass("animate__slideInRight")
    $(".e_nav_main").addClass("animate__slideOutRight")
    setTimeout(() => {
        $(".e_nav_main").removeClass("animate__slideOutRight")
        $(".e_nav_main").addClass("xl:hidden animate__slideInRight")
    }, 305)
})