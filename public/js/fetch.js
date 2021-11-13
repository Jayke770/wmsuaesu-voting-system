/* fetch with timeout */
async function fetchtimeout(source, options = {}){
    const {timeout = 600000} = options 
    $(".lazy-progress-bar").show(100)
    const controller = new AbortController() 
    const i = setTimeout( () => { 
        $(".lazy-progress-bar").hide(100)
        controller.abort()  
    }, timeout)
    const log = {
        link: source, 
        options: options
    }
    console.log('Fetch with timeout\n', log)
    try {
        const req  = await fetch(source, {
            ...options, 
            signal: controller.signal
        })
        clearTimeout(i) 
        $(".lazy-progress-bar").hide(100)
        return req
    } catch (e) {
        $(".lazy-progress-bar").hide(100)
        return new Error(e) 
    }
}