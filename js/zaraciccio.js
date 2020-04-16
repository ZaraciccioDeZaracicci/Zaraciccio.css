/*!
    zaraciccio.js
    Copyright Zaraciccio De Zaracicci, 2020
    Please read the LICENSE file (you can obtain one here: zaracicciocss.zarahost.rf.gd/license) and the README.md file.
    Thanks!
*/

$(function () {
    $(document).scroll(function () {
        var $nav = $(".nv-minimize");
        var $sidesec = $(".sidebar-secondary");
        var $side = $(".sidebar");
        $nav.toggleClass('scrolled', $(this).scrollTop() > $nav.height());
        $side.toggleClass('scrolled', $(this).scrollTop() > $side.height());
        $sidesec.toggleClass('scrolled', $(this).scrollTop() > $sidesec.height());
        chiudi();
    });
    $(document).on('click', function () {
        chiudi();
        return
    });
    return;
});

$(function () {
    $(this).bind("contextmenu", function (e) {  
        $('.left').toggleClass('close');
        $('.left').toggleClass('open');
        e.preventDefault();
    });
});

$(document).bind('mousemove', function(f){
    $('.left.close').css({
        left:  f.pageX + 20,
        top:   f.pageY
    });
});

function chiudi() {
    var $left = $(".left.open");
    $left.toggleClass('close');
    $left.toggleClass('open');
}