/* fetch with timeout */
async function fetchtimeout(source, options = {}){
    const {timeout = 8000} = options 
    const controller = new AbortController() 
    const i = setTimeout( () => { 
        controller.abort()  
    }, timeout)
    const response  = await fetch(source, {
        ...options, 
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        signal: controller.signal
    })
    clearTimeout(i) 
    return response
}