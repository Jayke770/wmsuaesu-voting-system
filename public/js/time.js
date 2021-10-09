$(document).ready( () => {
    setTimeout( () => {
        setInterval(() => {
            $(".time").each(function () {
                $(this).removeClass("skeleton")
                $(this).html(moment($(this).attr("data")).tz("Asia/Manila").fromNow())
            })
        }, 1000)
        setInterval(() => {
            $(".time-text").each(function () {
                $(this).removeClass("skeleton")
                $(this).html(moment($(this).attr("data")).tz("Asia/Manila").format('MMMM Do YYYY, h:mm a'))
            })
        }, 1000)
        setInterval(() => {
            $(".realtime-time").each( function () {
                $(this).html(moment().format('MMMM Do YYYY, h:mm:ss a'))
            })
        }, 1000)
    }, 1500)
})