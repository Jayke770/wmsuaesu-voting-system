$(document).ready( () => {
    const video = document.getElementById('facial')
    //camera capture
    const camera = new JslibHtml5CameraPhoto.default(video) 
    startcamera() 
    function startcamera() {
        camera.startCamera(JslibHtml5CameraPhoto.FACING_MODES['USER']).then(() => {
            console.log("Camera Started")
        }).catch((error) => {
            console.error('Camera not started!', error)
        })
    }
    function stopcamera() {
        camera.stopCamera().then(() => {
            console.log('Camera stoped!')
        }).catch((error) => {
            console.log('No camera to stop!:', error)
        })
    }
    $(".capture").click( function() {
        const captured = $(this).attr("captured") === "true" ? true : false 
        if(!captured){
            let timerInterval
            Swal.fire({
                icon: 'question', 
                title: 'Start Capture', 
                html: 'Please position your face properly', 
                backdrop: true, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                confirmButtonText: "Yes"
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info',
                        title: 'Please Wait',
                        html: 'Capturing in <b></b> milliseconds.',
                        timer: 1000,
                        timerProgressBar: true,
                        didOpen: () => {
                            Swal.showLoading()
                            const b = Swal.getHtmlContainer().querySelector('b')
                            timerInterval = setInterval(() => {
                                b.textContent = Swal.getTimerLeft()
                            }, 100)
                        },
                        willClose: () => {
                            clearInterval(timerInterval)
                        }
                    }).then((result) => {
                        if (result.dismiss === Swal.DismissReason.timer) {
                            setTimeout( async () => {
                                const captured = camera.getDataUri({
                                    sizeFactor: 1, 
                                    imageType: JslibHtml5CameraPhoto.IMAGE_TYPES.JPG, 
                                    imageCompression: 1
                                })
                                $(".facial-captured").val(captured)
                                $(".fc").attr("src", captured)
                                $(".facial-captured, .fc").removeClass("hidden") 
                                $("#facial").addClass("hidden")
                                $(this).text("Re-capture")
                                $(this).attr("captured", "true")
                                stopcamera()
                                const input = document.querySelector(".fc") 
                                const detections = await faceapi.detectAllFaces(input) 
                                console.log(detections)
                                
                            }, 1000)
                        }
                    })
                }
            })
        } else {
            let timerInterval
            $(".facial-captured").val(captured)
            $(".fc").attr("src", "")
            $(".facial-captured, .fc").addClass("hidden") 
            $("#facial").removeClass("hidden")
            $(this).text("Capture")
            $(this).attr("captured", "false")
            startcamera()
        }
    })
    let upload = false
    $(".upload-fc").submit( function (e) {
        e.preventDefault() 
        if(!upload && $(".facial-captured").val() !== ""){
            Swal.fire({
                icon: 'question', 
                title: 'Submit Facial Data', 
                backdrop: false, 
                allowOutsideClick: false, 
                showDenyButton: true, 
                confirmButtonText: 'Submit', 
                denyButtonText: 'Cancel'
            }).then( (a) => {
                if(a.isConfirmed){
                    Swal.fire({
                        icon: 'info', 
                        title: 'Submitting Facial Data', 
                        html: 'Please wait...', 
                        backdrop: false, 
                        allowOutsideClick: false, 
                        showConfirmButton: false, 
                        willOpen: async () => {
                            Swal.showLoading() 
                            try {
                                upload = true
                                const req = await fetchtimeout("/account/facial/upload/", {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: new FormData(this)
                                })
                                if(req.ok){
                                    const res = await req.json() 
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: false, 
                                        allowOutsideClick: false, 
                                    }).then( () => {

                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                upload = false
                                Swal.fire({
                                    icon: 'error', 
                                    title: 'Connection error', 
                                    html: e.message, 
                                    backdrop: false, 
                                    allowOutsideClick: false, 
                                })
                            }
                        }
                    })
                }
            })
        }
    })

    
})