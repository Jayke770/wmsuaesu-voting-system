function scroll_div(div, time ){
    $(div).stop()
    $(div).animate({ scrollTop: $(div)[0].scrollHeight }, !time || 1000)
}