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
}

$(document).ready(function() {
  menu()
  animations()
})