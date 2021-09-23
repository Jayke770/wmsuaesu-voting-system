/* fetch with timeout */
async function fetchtimeout(source, options = {}){
    const {timeout = 60000} = options 
    const controller = new AbortController() 
    const i = setTimeout( () => { 
        controller.abort()  
    }, timeout)
    const log = {
        link: source, 
        options: options
    }
    console.log('Fetch with timeout\n', log)
    const response  = await fetch(source, {
        ...options, 
        signal: controller.signal
    })
    clearTimeout(i) 
    return response
}