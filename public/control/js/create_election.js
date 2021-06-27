 //get election title 
 $(".other_e_name ").each(function(){
    setTimeout( () => {
        var html = $(this) 
        var str = html.html().split(" ")
        var text = ""
        for(var i = 0; i < str.length; i++){
            text = text + str[i].charAt(0).toUpperCase()
        }
        html.parent().parent().find(".icon_e_name").attr("src", avatar(text, color(), "transparent"))
    }, 2000)
})
//sweetalert toast
var toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})
//convert all data and time
setInterval(function () {
    created()
})
function created() {
    $(".created").each(function () {
        $(this).html('')
        $(this).html(timeago.format($(this).attr("datetime")))
    })
}
//close create election
$(".close_create").click(() => {
    $(".create").slideUp(500)
})

//submit election form
$(".election_name").submit(function (e) {
    e.preventDefault()
    toast.fire({
        timer: 0,
        title: "<i class='fa fa-spin fa-spinner' style='margin-right: 20px;'></i>Creating Please Wait",
    })
    $.ajax({
        type: "POST",
        url: "/create-election",
        data: new FormData(this),
        cache: false,
        processData: false,
        contentType: false,
        success: function (res) {
            if (res.created) {
                $(".pass").show(250)
                $(".election_name").hide(250)
                $(".valid_passcode").val(res.code)
                toast.fire({
                    icon: 'success',
                    title: res.msg,
                })
            }
            else {
                toast.fire({
                    icon: 'error',
                    title: res.msg,
                })
            }
        }
    });
})
$(".add_election").click(() => {
    $(".create").addClass("animate__animated animate__zoomInDown")
    $(".create").css("display", "block")
    //remove animation class 
    setTimeout(() => {
        $(".create").removeClass("animate__animated animate__zoomInDown")
    }, 1000)
})

//add input
const div_positons = '<div class="inpt_adder"><input type="text" name="position" class="wmsu_inpt wmsu_inpt_focus" placeholder="Position" required><input type="number" name="max_vote" class="wmsu_inpt wmsu_inpt_focus" placeholder="Max Vote" required></div>'
$(".add_pos").click(function () {
    //check the last input 
    const current_pos = $(".pos_adder").find('.inpt_adder').last().find("input[name='position']").val()
    const current_max_vote = $(".pos_adder").find('.inpt_adder').last().find("input[name='max_vote']").val()
    //check if the current inputs is not empty
    if (current_pos != "" && current_max_vote != "") {
        $(".pos_adder").append(div_positons)
    }
})