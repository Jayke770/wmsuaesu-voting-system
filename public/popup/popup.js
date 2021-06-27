//parameters msg is for text, rdr if the current state will reload
function init_popup(cls, effect) {
    const popup = '<div class="popup"> <div class="title"></div></div>';
    $(cls).html(popup);
    console.log('Popup loaded at : ' + cls);
    console.log('To call the function popup use " popup("message", "reload set to true or false"): ');
}

function popup(msg, rdr) {
    var popup = $(".popup").css("bottom");
    $(".title").html(msg);
    if (popup == "0px") { /*mobile*/
        //if popup is not visible, prevent to animate
        if($(".popup").css("display") == "none"){
            $(".popup").attr("style", "");
            $(".popup").css("display", "block");
            $(".popup").animate({
                top: "20%"
            }, 250);
        }
        if (rdr) {
            setTimeout(function() {
                window.location.reload(true);
            }, 600);
        }
        setTimeout(function() {
            $(".popup").css("display", "none");
            $(".popup").animate({
                top: "0"
            }, 250);
        }, 3000);
    } else { /*pc*/
        if($(".popup").css("display") == "none"){
            $(".popup").attr("style", "");
            $(".popup").css("display", "block");
            $(".popup").animate({
                bottom: "10px"
            }, 250);
        }
        if (rdr) {
            setTimeout(function() {
                window.location.reload(true);
            }, 600);
        }
        setTimeout(function() {
            $(".popup").css("display", "none");
            $(".popup").animate({
                bottom: "-50%"
            }, 250);
        }, 3000);
    }
}