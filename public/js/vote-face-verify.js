const video = document.getElementById('facial')
const capture = document.getElementById('fc')
let logindata = new FormData(), facialverified = false, voteData, image = false
//camera capture
let cameraStream = null, vidPlaying = false
function startcamera() {
    const mediaSupport = 'mediaDevices' in navigator
    Swal.fire({
        icon: 'warning', 
        title: 'Requesting Camera Permission', 
        html: 'Please allow camera permission to verify your face', 
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
                            title: 'Unable to access the camera',
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
$(".capture").click(function () {
    const captured = $(this).attr("captured") === "true" ? true : false
    if (!captured && vidPlaying) {
        let timerInterval
        Swal.fire({
            icon: 'question',
            title: 'Start Capture',
            html: 'Please position your face properly',
            backdrop: true,
            allowOutsideClick: false,
            showDenyButton: true,
            confirmButtonText: "Yes"
        }).then((a) => {
            if (a.isConfirmed) {
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
                        setTimeout(async () => {
                            if (null != cameraStream) {
                                var ctx = capture.getContext('2d')
                                var img = new Image()
                                ctx.drawImage(video, 0, 0, capture.width, capture.height)
                                img.src = capture.toDataURL("image/jpeg")
                                img.width = 250
                                const res = await fetch(img.src)
                                const blob = await res.blob()
                                const file = new File([blob], '1.jpg', blob)
                                logindata.append("faciallogin", file)
                                image = true
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
        logindata.delete("faciallogin")
        startcamera()
    }
})
let upload = false
$(".upload-fc").submit(function (e) {
    e.preventDefault()
    if (!upload && image) {
        Swal.fire({
            icon: 'question',
            title: 'Submit Facial Data',
            backdrop: false,
            allowOutsideClick: false,
            showDenyButton: true,
            confirmButtonText: 'Submit',
            denyButtonText: 'Cancel'
        }).then((a) => {
            if (a.isConfirmed) {
                Swal.fire({
                    icon: 'info',
                    title: 'Checking Facial Data',
                    html: 'Please wait...',
                    backdrop: false,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    willOpen: async () => {
                        Swal.showLoading()
                        try {
                            upload = true
                            const req = await fetchtimeout("/account/facial/login/", {
                                method: 'POST',
                                headers: {
                                    'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                },
                                body: logindata
                            })
                            if (req.ok) {
                                const res = await req.json()
                                stopcamera()
                                if(res.redirect){
                                    Swal.fire({
                                        icon: 'info',
                                        title: res.txt,
                                        html: res.msg,
                                        backdrop: false,
                                        allowOutsideClick: false,
                                        willOpen: () => {
                                            window.location.assign('/home')
                                        }
                                    })
                                } else {
                                    if(res.status){
                                        Swal.fire({
                                            icon: 'info',
                                            title: res.txt,
                                            html: res.msg,
                                            backdrop: false,
                                            allowOutsideClick: false,
                                            showConfirmButton: false,
                                            willOpen: async () => {
                                                Swal.showLoading() 
                                                try {
                                                    const req = await fetchtimeout('submit-vote/', {
                                                        method: 'POST', 
                                                        headers: {
                                                            'X-CSRF-TOKEN': $("meta[name='csrf-token']").attr("content")
                                                        }, 
                                                        body: voteData
                                                    })
                                                    if(req.ok){
                                                        const res = await req.json() 
                                                        upload = false
                                                        Swal.fire({
                                                            icon: res.status ? 'success' : 'info', 
                                                            title: res.txt, 
                                                            html: res.msg, 
                                                            backdrop: true, 
                                                            confirmButtonText: res.status ? 'Thank You' : 'OK',
                                                            allowOutsideClick: false
                                                        }).then( () => {
                                                            if(res.status){
                                                                window.location.assign(`/home/election/id/election/${$('meta[name="electionID"]').attr("content")}/results/`)
                                                                $(".submit-vote").find("button[type='reset']").click() 
                                                            } 
                                                        })
                                                    } else {
                                                        throw new Error(`${req.status} ${req.statusText}`)
                                                    }
                                                } catch (e) {
                                                    upload = true
                                                    Swal.fire({
                                                        icon: 'error', 
                                                        title: "Connection Error", 
                                                        html: e.message, 
                                                        backdrop: true, 
                                                        allowOutsideClick: false
                                                    })
                                                }
                                            }
                                        })
                                    } else {
                                        Swal.fire({
                                            icon: 'info',
                                            title: res.txt,
                                            html: res.msg,
                                            backdrop: false,
                                            allowOutsideClick: false,
                                        }).then( () => {
                                            upload = false
                                            $(this).text("Capture")
                                            $(this).attr("captured", "false")
                                            logindata.delete("faciallogin")
                                        })
                                    }
                                }
                            } else {
                                throw new Error(`${req.status} ${req.statusText}`)
                            }
                        } catch (e) {
                            upload = false
                            $(this).text("Capture")
                            $(this).attr("captured", "false")
                            logindata.delete("faciallogin")
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