const theme = localStorage.getItem('theme')
const sun = '<i class="fa fa-sun"></i>'
const moon = '<i class="fa fa-moon"></i>'
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
    $("meta[name='theme-color']").attr("content", "#161b22")
    if($(".dark_mode").length !== 0){
        $(".dark_mode").html(moon)
    }
}