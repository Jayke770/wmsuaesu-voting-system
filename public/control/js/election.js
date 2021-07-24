'use strict'
/*Election */
$(".more_e_settings").click(function(){
    $.post($(this).attr("href").replace("#", ""), async (res, status, xhr) => {
        $(".main_admin, .floating").addClass("hidden")
        if (status == 'success') {
            $(".loader").html(res)
        }
    })
})
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