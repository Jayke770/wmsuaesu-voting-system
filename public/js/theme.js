const theme = localStorage.getItem('theme')
const sweetalert_dark = "//cdn.jsdelivr.net/npm/@sweetalert2/theme-dark@4/dark.min.css"
if (theme == null) {
    //set to default theme if null 
    localStorage.setItem('theme', 'default')
    $('html').addClass("default")
    console.log("Theme", theme)
}
if (theme == "default") {
    $('html').addClass("default")
    console.log("Theme", theme)
}
if (theme == "dark") {
    $('html').addClass("dark")
    console.log("Theme", theme)
    //login page toggle 
    $(".dark_mode").prop("checked", true)

    //change sweetalert theme
    if($(".sweetalert-link").length !== 0){
        $(".sweetalert-link").attr("href", sweetalert_dark)
        $("meta[name='theme-color']").attr("content", "#161b22")
    } 
    if($(".dark_mode").length !== 0){
        $(".dark_mode").removeClass("fa-sun")
        $(".dark_mode").addClass("fa-moon")
    }
}