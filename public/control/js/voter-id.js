'use stirct'
var req_id_number = false, add_voter_id = false
$(".add_voter").click( () => {
    if($(".popup").hasClass("hidden")){
        $(".popup").removeClass("hidden")
        setTimeout( () => {
            $(".add_voter_id").removeClass($(".add_voter_id").attr("animate-in"))
        }, 901)
    }
})
$(".cls_add_voter_id").click( () => {
    if(!$(".popup").hasClass("hidden")){
        $(".add_voter_id").addClass($(".add_voter_id").attr("animate-out"))
        setTimeout( () => {
            $(".add_voter_id").addClass($(".add_voter_id").attr("animate-in"))
            $(".add_voter_id").removeClass($(".add_voter_id").attr("animate-out"))
            $(".popup").addClass("hidden")
        }, 900)
    }
})
//check voter id 
$(".id_number").keyup(function(){
    if($(this).val() !== ""){
        if(!req_id_number){
            $(".status_voter_id_status").html("Checking")
            $(".status_voter_id").removeClass("hidden")
            $(".status_voter_id").addClass("flex")
            req_id_number = true
            $.post("/control/voter-id/", 
            {
                id: $(this).val()
            }, (res) => {
                req_id_number = false
                if(res.status){
                    $(".status_voter_id_status").addClass("text-green-600")
                    $(".status_voter_id_status").removeClass("text-rose-600")
                    $(".status_voter_id_status").html(res.msg)
                    $(".year_voter, .crs_voter").removeAttr("disabled")
                }
                else{
                    $(".status_voter_id_status").removeClass("text-green-600")
                    $(".status_voter_id_status").addClass("text-rose-600")
                    $(".status_voter_id_status").html(res.msg)
                }
            })
        }
    }
})
$(".id_number").keydown(function(){
    if($(this).val() === ""){
        $(".status_voter_id").addClass("hidden")
        $(".status_voter_id").removeClass("flex")
        $(".status_voter_id_status").html("Checking")
    }
})
setInterval( () => {
    if($(".id_number").val() === ""){
        $(".status_voter_id").addClass("hidden")
        $(".status_voter_id").removeClass("flex")
        $(".status_voter_id_status").html("Checking")
    }
    if($(".year_voter, .crs_voter, id_number").val().trim() !== ""){
        $(".add_btn_voter_id").removeAttr("disabled")
    }
})
//submit add voter id
$(".add_voter_id_form").submit(function(e){
    e.preventDefault()
    Swal.fire({
        title: 'Please Wait', 
        showConfirmButton: false,
        backdrop: true,
        willOpen: () => {
            Swal.showLoading()
            $.ajax({
                url: '/control/add-voter-id/',
                method: 'POST',
                cache: false,
                contentType: false,
                processData: false,
                data: new FormData(this),
                success: function (res) {
                    if (res.status) {
                        Swal.fire({
                            icon: 'success', 
                            backdrop: true, 
                            showConfirmButton: true,
                            allowOutsideClick: false,
                            title: res.msg
                        })
                        $(".reset_voter_id_form").click()
                        append_voter_id(res.data)
                    } else {
                        Swal.fire({
                            icon: 'error', 
                            backdrop: true, 
                            showConfirmButton: true,
                            allowOutsideClick: false,
                            title: res.msg
                        })
                    }
                },
            });
        },
        allowOutsideClick: () => !Swal.isLoading()
    })
})
function append_voter_id(data){
    var badge, text
    if(data.enabled){
        badge = 'bg-green-700'
        text = "Used"
    }
    else{
        badge = "bg-amber-600"
        text = "Not Used"
    }
    $(".voters_id_all").append(`
        <div data="${data._id}" class="w-full p-3 bg-gray-50 dark:bg-darkBlue-secondary rounded-lg cursor-pointer">
            <div class="w-full">
                <span class="font-normal text-base dark:text-gray-300">${data.student_id}</span>
                <span class="float-right font-medium text-fuchsia-600 dark:text-fuchsia-500">${data.course} ${data.year}</span>
            </div>
            <div class="mt-2 p-2">
                <a data="${data._id}" class="rpl text-lg rounded-md text-purple-600 dark:text-purple-500 p-2">
                    <i class="fas fa-edit"></i>
                </a>
                <a data="${data._id}" class="rpl text-lg rounded-md  text-rose-600 dark:text-rose-500 p-2">
                    <i class="fas fa-trash-alt"></i>
                </a>
                <span class="${badge} float-right text-sm mt-3 px-2 py-[2px] rounded-md text-gray-100">${text}</span>
            </div>
        </div>
    `)
}