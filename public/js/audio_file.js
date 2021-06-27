$(document).ready(() => {
    const nty_audio = localStorage.getItem('nty')
    const sent_audio = localStorage.getItem('sent')
    const msg_audio = localStorage.getItem('msg')
    //nty audio 
    //check if audio is saved before
    if (!nty_audio) {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                const reader = new FileReader();
                reader.onload = function () {
                    var str = this.result;
                    //save to localstorage
                    try {
                        localStorage.setItem('nty', str)
                    }
                    catch (e) {
                        console.warn("Failed To Saved Audio", + e)
                    }
                };
                reader.readAsDataURL(this.response);
            }
        };
        xhr.open('GET', '/assets/audio/nty.mp3');
        xhr.responseType = 'blob';
        xhr.send();
    }
    //sent audio 
    //check if audio is saved before
    if (!sent_audio) {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                const reader = new FileReader();
                reader.onload = function () {
                    var str = this.result;
                    //save to localstorage
                    try {
                        localStorage.setItem('sent', str)
                    }
                    catch (e) {
                        console.warn("Failed To Saved Audio", + e)
                    }
                };
                reader.readAsDataURL(this.response);
            }
        };
        xhr.open('GET', '/assets/audio/sent.mp3');
        xhr.responseType = 'blob';
        xhr.send();
    }
    //msg audio 
    //check if audio is saved before
    if (!msg_audio) {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                const reader = new FileReader();
                reader.onload = function () {
                    var str = this.result;
                    //save to localstorage
                    try {
                        localStorage.setItem('msg', str)
                    }
                    catch (e) {
                        console.warn("Failed To Saved Audio", + e)
                    }
                };
                reader.readAsDataURL(this.response);
            }
        };
        xhr.open('GET', '/assets/audio/msg.mp3');
        xhr.responseType = 'blob';
        xhr.send();
    }
})