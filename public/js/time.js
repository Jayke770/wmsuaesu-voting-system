 //time ago 
 var locale = function (number, index, totalSec) {
    return [
        ['Now', 'right now'],
        ['%ss', 'in %s seconds'],
        ['1min', 'in 1 minute'],
        ['%sm', 'in %s minutes'],
        ['1h', 'in 1 hour'],
        ['%shrs', 'in %s hours'],
        ['1D', 'in 1 day'],
        ['%sD ago', 'in %s days'],
        ['1W ago', 'in 1 week'],
        ['%sW ago', 'in %s weeks'],
        ['1month', 'in 1 month'],
        ['%smonths', 'in %s months'],
        ['1year', 'in 1 year'],
        ['%syears', 'in %s years']
    ][index];
};
timeago.register('custom', locale);
setInterval(() => {
    $(".time").each(function () {
        $(this).html(timeago.format($(this).attr("date-time"), 'custom'))
    })
}, 1000)