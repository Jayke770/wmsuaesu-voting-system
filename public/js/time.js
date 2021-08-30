$(document).ready( () => {
    setTimeout( () => {
        setInterval(() => {
            $(".time").each(function () {
                $(this).removeClass("skeleton")
                $(this).html(moment($(this).attr("data")).fromNow())
            })
        }, 1000)
    }, 1500)
})