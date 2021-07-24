'use strict' 
const div = ['voter_info', 'edit_voter_info', 'facial_data', 'account_settings']
$(".loader").delegate(".voter_data_menu", "click", function(e){
    e.preventDefault() 
    $(".voter_menu").removeClass("hidden")
    setTimeout( () => {
        $(".main_voter_menu").removeClass("animate__animated animate__bounceIn ms-900")
    }, 901)
})
$(".loader").delegate(".close_voter_menu", "click", function(e){
    e.preventDefault()
    $(".main_voter_menu").addClass("animate__animated animate__bounceOut ms-900")
    setTimeout( () => {
        $(".main_voter_menu").removeClass("animate__animated animate__bounceOut ms-900")
        $(".voter_menu").addClass("hidden")
    }, 901)
})
$(".loader").delegate(".voter_btn_menu", "click", function(e) {
    e.preventDefault() 
    const click_div = $(this).attr("data")
    for(let i = 0; i < div.length; i++){
        $(`.${div[i]}`).addClass("hidden")
    }
    $(`.${click_div}`).removeClass("hidden")
})