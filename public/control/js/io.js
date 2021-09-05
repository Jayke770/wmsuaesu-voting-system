const socket = io('/admin') 
socket.emit("test", 'hi', async (res) => {
    console.log( await res)
})