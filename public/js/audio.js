function nty() {
    const nty = localStorage.getItem('nty')
    var sound = new Howl({
        src: [nty],
        volume: 0.1
    })
    sound.play()
}
function sent() {
    const sent = localStorage.getItem('sent')
    var sound = new Howl({
        src: [sent], 
        volume: 1
    })
    sound.play()
}
function new_(vol) {
    const msg  = localStorage.getItem('msg')
    var sound = new Howl({
        src: [msg], 
        volume: vol
    })
    sound.play()
}