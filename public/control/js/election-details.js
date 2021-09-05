$(document).ready( () => {
    //get the election starting time  
    let e_start = (new Date($("body").find(".e_start").attr("data")).getTime() / 1000), start = false
    let flipdown = new FlipDown(e_start, "e_start")
    flipdown.start()
    flipdown.ifEnded(() => {
        $("body").find(".e_start").remove()
    })
    //get the election ending time  
    const e_end = (new Date($("body").find(".e_end").attr("data")).getTime() / 1000)
    let flipdown_end = new FlipDown(e_end, "e_end")
    flipdown_end.start()
    flipdown_end.ifEnded(() => {
        
    })
    //set the theme of flipdown 
    const theme = localStorage.getItem('theme') === "dark" ? true : false
    $("body").find(".e_start, .e_end").removeClass(theme ? 'flipdown__theme-dark' : 'flipdown__theme-light')
    $("body").find(".e_start, .e_end").addClass(theme ? 'flipdown__theme-light' : 'flipdown__theme-dark')
})