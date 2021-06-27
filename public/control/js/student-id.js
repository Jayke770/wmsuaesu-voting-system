//sweetalert toast
var toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})
//load all student ids for the first time
$(".loading_main").show(100)
show_ids()

function show_ids() {
    toast.fire({
        timer: 0,
        title: "<i class='fa fa-spin fa-spinner' style='margin-right: 20px;'></i>Getting All ID's",
    })
    $.post('/ids', function (ids) {
        $(".loading_main").hide(100)
        $(".st_ids").html("")
        var all_ids = ids.student_ids
        if (all_ids.length == 0) {
            $(".st_ids").append("<tr><td  style='border: var(--light_border);' colspan='4'>Nothing To Fetch</td></tr>")
        } else {
            for (var i = 0; i < all_ids.length; i++) {
                const data1 = JSON.stringify(all_ids[i])
                const data = JSON.parse(data1)
                $(".st_ids").append("<tr ><td>" + data.student_id + "</td><td>" + data.course + "</td><td>" + data.year + "</td><td>" + data.enabled + "</td></tr>")
            }
        }
        toast.fire({
            icon: 'success',
            title: "All ID's Fetched",
        })
    })
}
$(".search_id").on("keyup", function () {
    if ($(this).val().length > 6) {
        $(".loading_main").show(100)
        $.post('/find-id', {
            id: $(this).val()
        }, function (ids) {
            $(".loading_main").hide(100)
            $(".st_ids").html("")
            var all_ids = ids.result
            if (all_ids.length == 0) {
                $(".st_ids").append("<tr><td  style='border: var(--light_border);' colspan='4'>Nothing To Fetch</td></tr>")
            } else {
                for (var i = 0; i < all_ids.length; i++) {
                    const data1 = JSON.stringify(all_ids[i])
                    const data = JSON.parse(data1)
                    $(".st_ids").append("<tr><td>" + data.student_id + "</td><td>" + data.course + "</td><td>" + data.year + "</td><td>" + data.enabled + "</td></tr>")
                }
            }
        })
    }
});
$(".sort_id").change(function () {
    $(".ld").show()
    $.post('/sort-id', {
        sort: $(this).val()
    }, function (sort) {
        $(".ld").hide()
        $(".st_ids").html("")
        var sort = sort.sort
        if (sort.length == 0) {
            $(".st_ids").append("<tr><td style='border: var(--light_border);' colspan='4'>Nothing To Fetch</td></tr>")
        } else {
            for (var i = 0; i < sort.length; i++) {
                const data1 = JSON.stringify(sort[i])
                const data = JSON.parse(data1)
                $(".st_ids").append("<tr><td>" + data.student_id + "</td><td>" + data.course + "</td><td>" + data.year + "</td><td>" + data.enabled + "</td></tr>")
            }
        }
    });
});
//for student settings menu
$(".menu_ac").click(function () {
    $(".valid_id").removeClass("animate__zoomOutDown")
    $(".valid_id ").show()
    $(".valid_id").addClass("animate__zoomInDown")
})
$(".cl_val").click(function () {
    $(".valid_id").removeClass("animate__zoomInDown")
    $(".valid_id").addClass("animate__zoomOutDown")
    setTimeout(() => {
        $(".valid_id ").hide()
    }, 200)
})
$(".st").click(function () {
    const data = $(this).attr("data-open")
    $(".st_id_actions").slideUp(200)
    $("." + data).slideDown(200)
})
$(".back").click(function () {
    const data = $(this).attr("data-open")
    $(".st_id_actions").slideDown(200)
    $("." + data).slideUp(200)
})
//add student
$(".add").submit(function (e) {
    e.preventDefault()
    toast.fire({
        timer: 0,
        title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i>Please Wait',
    })
    $.ajax({
        url: '/add-id',
        method: 'POST',
        data: new FormData(this),
        cache: false,
        contentType: false,
        processData: false,
        success: function (res_add) {
            if (res_add.add) {
                toast.fire({
                    icon: 'success',
                    title: res_add.msg,
                })
                $(".add").find('.reset').click()
                show_ids()
            } else {
                toast.fire({
                    icon: 'info',
                    title: res_add.msg,
                })
            }
        }
    })
});
//delete student id
$(".delete").submit(function (e) {
    e.preventDefault()
    toast.fire({
        timer: 0,
        title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i> Deleting',
    })
    $.ajax({
        url: '/delete-id',
        method: 'POST',
        data: new FormData(this),
        cache: false,
        contentType: false,
        processData: false,
        success: function (res_del) {
            if (res_del.del) {
                toast.fire({
                    icon: 'success',
                    title: res_del.msg,
                })
                $(".add").find('.reset').click()
                show_ids()
            } else {
                toast.fire({
                    icon: 'info',
                    title: res_del.msg,
                })
            }
        }
    })
})
//update student id
$(".update").submit(function (e) {
    e.preventDefault()
    toast.fire({
        timer: 0,
        title: '<i class="fa fa-spin fa-spinner" style="margin-right: 20px;"></i> Updating',
    })
    $.ajax({
        url: '/update-id',
        method: 'POST',
        data: new FormData(this),
        cache: false,
        contentType: false,
        processData: false,
        success: function (res_up) {
            if (res_up.up) {
                toast.fire({
                    icon: 'success',
                    title: res_up.msg,
                })
                $(".add").find('.reset').click()
                show_ids()
            } else {
                toast.fire({
                    icon: 'info',
                    title: res_up.msg,
                })
            }
        }
    })
})
//open close search
$(".search_id_ic").click(function () {
    $(".search_id, .search_id_ic_back").show()
    $(".search_id_ic, .selection, .actions_menu").hide(300)
})
$(".search_id_ic_back").click(function () {
    $(".search_id, .search_id_ic_back").hide()
    $(".search_id_ic, .selection, .actions_menu").show(300)
})
//logout
$.post('/users', function (r) {
    console.log(r)
})