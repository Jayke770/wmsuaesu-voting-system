$("document").ready( () => {
    //add new page icon 
    $(".profile-icon").attr("href", avatar($(".profile-icon").attr("data"), light(), '#f2f2f200', "120px"))
    //add custom profile picture if profile picture is null 
    const profile_img = $(".profile-image").attr("src")
    if(!profile_img){
        $(".profile-image").attr("src", avatar($(".profile-image").attr("data"), light(), dark(), "100px"))
    }
})