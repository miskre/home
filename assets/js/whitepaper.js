//@prepros-prepend ../../node_modules/jquery/dist/jquery.min.js
//@prepros-prepend ../../node_modules/remodal/dist/remodal.min.js
//@prepros-prepend ../../node_modules/slick-carousel/slick/slick.min.js
//@prepros-prepend ../../node_modules/aos/dist/aos.js
//@prepros-prepend ../../node_modules/modernizr/bin/modernizr.js

function animations() {
  if (AOS) {
    AOS.init({
      duration: 500
    })
  }
}

function menu() {
  var section = $('#menu')
  var toggle = $('#top-bar .menu')
  toggle.click(function(e) {
    e.preventDefault()
    if (section.hasClass('h')) {
      section.removeClass('h').hide().fadeIn('fast')
      toggle.addClass('opened')
      $('html, body').addClass('no-scroll')
    } else {
      section.fadeOut('fast', function() {
        section.addClass('h')
      })
      toggle.removeClass('opened')
      $('html, body').removeClass('no-scroll')
    }
  })
  $(section).on('click', '.navigations a', function(e) {
    var element, link
    section.fadeOut('fast', function() {
      $('html, body').removeClass('no-scroll')
      section.addClass('h')
    })
    toggle.removeClass('opened')
    link = $(e.target).attr('href')
    element = $(link)
    $('html, body').animate({
      scrollTop: element.offset().top
    }, 1000)
  })
}

$(document).ready(function() {
  menu()
  animations()
})