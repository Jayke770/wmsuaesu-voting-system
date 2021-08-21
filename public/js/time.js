 //time ago 
 var locale = function (number, index, totalSec) {
    return [
        ['Now', 'right now'],
        ['%ss', 'in %s seconds'],
        ['1min', 'in 1 minute'],
        ['%sm', 'in %s minutes'],
        ['1 hour', 'in 1 hour'],
        ['%s hours', 'in %s hours'],
        ['1 day', 'in 1 day'],
        ['%s day ago', 'in %s days'],
        ['1 week ago', 'in 1 week'],
        ['%s weeks ago', 'in %s weeks'],
        ['1 month', 'in 1 month'],
        ['%s months', 'in %s months'],
        ['1 year', 'in 1 year'],
        ['%s years', 'in %s years']
    ][index];
};
timeago.register('custom', locale);
setInterval(() => {
    $(".time").each(function () {
        $(this).html(timeago.format($(this).attr("data"), 'custom'))
    })
}, 1000)