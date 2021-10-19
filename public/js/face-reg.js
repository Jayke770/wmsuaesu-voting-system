$(document).ready(function () {
    $(".face").submit(function(e) {
        e.preventDefault()
        toast.fire({
            timer: 0,
            title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i>Please Wait',
        })
        $.ajax({
            url: '/register-face',
            method: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            data: new FormData(this),
            success: function (res) {
                $(".image_file").val("")
                if(res.reg){
                    toast.fire({
                        icon: 'success',
                        title: res.msg,
                    }).then(() => {
                        start()
                        $("#video").show()
                        $("#pic").attr("src", "")
                        $(".capture").attr("capture", "false")
                        $(".capture").html("Capture")
                        window.location.reload()
                    })
                }
                else{
                    toast.fire({
                        icon: 'error',
                        title: res.msg,
                    }).then(() => {
                        start()
                        $("#video").show()
                        $("#pic").attr("src", "")
                        $(".capture").attr("capture", "false")
                        $(".capture").html("Capture")
                    })
                }
            },
        });
    })
    async function start(){
        var FACING_MODES = JslibHtml5CameraPhoto.FACING_MODES;
        var facingMode = 'user'
        await cameraPhoto.startCamera(FACING_MODES[facingMode]).then(() => {
            console.log("Camera Started")
        }).catch((error) => {
            console.error('Camera not started!', error)
        })
    }
})