$(document).ready( () => {
    //get the election starting time  
    const e_start = (new Date($("body").find(".e_start").attr("data")).getTime() / 1000)
    let flipdown = new FlipDown(e_start, "e_start")
    flipdown.start()
    flipdown.ifEnded(() => {
        //todo
    })
    //set the theme of flipdown 
    const theme = localStorage.getItem('theme') === "dark" ? true : false
    $("body").find(".e_start").removeClass(theme ? 'flipdown__theme-dark' : 'flipdown__theme-light')
    $("body").find(".e_start").addClass(theme ? 'flipdown__theme-light' : 'flipdown__theme-dark')
})