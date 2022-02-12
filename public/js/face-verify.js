$(document).ready( async () => {
    const video = document.getElementById('facial')
    const capture = document.getElementById('fc')
    let regdata = new FormData()
    //camera capture
    startcamera()
    let cameraStream = null, vidPlaying = false
    const mediaSupport = 'mediaDevices' in navigator 
    function startcamera() {
        Swal.fire({
            icon: 'warning', 
            title: 'Requesting Camera Permission', 
            html: 'Please allow camera permission to register your face', 
            backdrop: true, 
            allowOutsideClick: false, 
            showConfirmButton: false, 
            willOpen: () => {
                Swal.showLoading()
                setTimeout( () => {
                    if (mediaSupport && null == cameraStream) {
                        navigator.mediaDevices.getUserMedia({ video: true }).then(function (mediaStream) {
                            cameraStream = mediaStream
                            video.srcObject = mediaStream
                            video.play()
                        }).then( () => {
                            Swal.close()
                        }).catch(function (err) {
                            console.log(err)
                            Swal.fire({
                                icon: 'info',
                                title: 'Unable to acess the camera',
                                html: 'Please restart your browser',
                                backdrop: true,
                                allowOutsideClick: false,
                            })
                        })
                    } else {
                        Swal.fire({
                            icon: 'info',
                            title: 'Unsupported Browser',
                            html: 'We Suggest to use Chrome or Mozilla Browser',
                            backdrop: true,
                            allowOutsideClick: false,
                        })
                    }
                }, 1000)
            }
        })
    }
    video.addEventListener('playing', () => {
        vidPlaying = true
    })
    $(".capture").click( function() {
        const captured = $(this).attr("captured") === "true" ? true : false 
        if(!captured && vidPlaying){
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
                        title: 'Capturing Please Wait',
                        timer: 1000,
                        toast: true,
                        timerProgressBar: true,
                        showConfirmButton: false,
                        position: 'top',
                        didOpen: () => {
                            Swal.showLoading()
                        },
                        willClose: () => {
                            clearInterval(timerInterval)
                        }
                    }).then( (result) => {
                        if (result.dismiss === Swal.DismissReason.timer) {
                            setTimeout( async () => {
                                if (null != cameraStream) {
                                    var ctx = capture.getContext('2d')
                                    var img = new Image() 
                                    ctx.drawImage(video, 0, 0, capture.width, capture.height) 
                                    img.src = capture.toDataURL("image/jpeg")
                                    img.width = 250
                                    const res = await fetch(img.src)
                                    const blob = await res.blob()
                                    const file = new File([blob], `1.jpg`, blob)
                                    regdata.append("facialreg", file)
                                    video.classList.add("hidden")
                                    capture.classList.remove("hidden")
                                    $(this).text("Re-capture")
                                    $(this).attr("captured", "true")
                                    stopcamera()
                                }
                            }, 1000)
                        }
                    })
                }
            })
        } else {
            video.classList.remove("hidden")
            capture.classList.add("hidden")
            $(this).text("Capture")
            $(this).attr("captured", "false")
            regdata.delete("facialreg")
            startcamera()
        }
    })
    let upload = false
    $(".upload-fc").submit( function (e) {
        e.preventDefault() 
        if(!upload){
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
                                const req = await fetchtimeout("/account/facial/register/", {
                                    method: 'POST', 
                                    headers: {
                                        'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                    }, 
                                    body: regdata
                                })
                                if(req.ok){
                                    const res = await req.json()
                                    regdata.delete("facialreg")
                                    upload = false
                                    Swal.fire({
                                        icon: res.status ? 'success' : 'info', 
                                        title: res.txt, 
                                        html: res.msg, 
                                        backdrop: false, 
                                        allowOutsideClick: false, 
                                        showConfirmButton: res.status ? false : true, 
                                        willOpen: () => {
                                            if(res.status){
                                                Swal.showLoading()
                                                window.location.assign('/home')
                                            } else {
                                                video.classList.remove("hidden")
                                                capture.classList.add("hidden")
                                                $(".capture").text("Re-Capture")
                                                $(".capture").attr("captured", "true")
                                            }
                                        }
                                    })
                                } else {
                                    throw new Error(`${req.status} ${req.statusText}`)
                                }
                            } catch (e) {
                                video.classList.remove("hidden")
                                capture.classList.add("hidden")
                                $(".capture").text("Re-Capture")
                                $(".capture").attr("captured", "true")
                                regdata.delete("facialreg")
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
    function stopcamera() {
        if (null != cameraStream) {
            var track = cameraStream.getTracks()[0]
            track.stop()
            cameraStream = null
        }
    }
})