//get all fullnames
setTimeout(() => {
    //ad delay 
    fullname()
}, 100)
function fullname() {
    $(".name").each(function () {
        var html = $(this)
        $.post('/ca-fullname', {
            ca_id: $(this).attr("id")
        }, (res) => {
            if (res.isvalid) {
                var flname = res.data[0].firstname + ' ' + res.data[0].middlename + ' ' + res.data[0].lastname
                html.html(flname)
                html.attr("id", "")
            }
            else {
                toast.fire({
                    icon: 'error',
                    title: res.msg,
                })
            }
        })
    })
}