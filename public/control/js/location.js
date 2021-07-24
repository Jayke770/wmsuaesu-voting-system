'use strict'
var loc = location.hash.replace("#", "") 
if (!location.hash == "") {
    $.post(location.hash.replace("#", ""), async (res, status, xhr) => {
        $(".main_admin, .floating").addClass("hidden")
        if (status == 'success') {
            $(".loader").html(res)
        }
    })
}