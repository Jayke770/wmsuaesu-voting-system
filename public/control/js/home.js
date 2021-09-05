$(document).ready(() => {
    setTimeout( () => {
        $(".election_list").find(".icon_e_name").each( function() {
            $(this).removeClass("skeleton-image")
            $(this).attr("src", avatar($(this).attr("data"), "#fff", dark()) )
        })
    }, 1000)
    //open nav
    $(".open_nav").click(function () {
        const nav = $(".nav")
        nav.addClass(nav.attr("animate-in"))
        nav.removeClass("my:hidden")
        setTimeout(() => {
            nav.removeClass(nav.attr("animate-in"))
        }, 300)
    })
    $(".close_nav").click(function () {
        const nav = $(".nav")
        nav.addClass(nav.attr("animate-out"))
        setTimeout(() => {
            nav.addClass("my:hidden")
            nav.removeClass(nav.attr("animate-out"))
        }, 300)
    })
})