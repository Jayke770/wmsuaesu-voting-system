/* fetch with timeout */
async function fetchtimeout(source, options = {}){
    const {timeout = 60000} = options 
    $(".lazy-progress-bar").show(100)
    const controller = new AbortController() 
    const i = setTimeout( () => { 
        $(".lazy-progress-bar").hide(100)
        controller.abort()  
        return 'Connection Timeout'
    }, timeout)
    const log = {
        link: source, 
        options: options
    }
    console.log('Fetch with timeout\n', log)
    try {
        const response  = await fetch(source, {
            ...options, 
            signal: controller.signal
        })
        clearTimeout(i) 
        $(".lazy-progress-bar").hide(100)
        return response
    } catch (e) {
        return new Error(e)
    }
}