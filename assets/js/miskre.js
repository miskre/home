//@prepros-prepend ../../node_modules/jquery/dist/jquery.min.js
//@prepros-prepend ../../node_modules/moment/min/moment.min.js
//@prepros-prepend ../../node_modules/remodal/dist/remodal.min.js
//@prepros-prepend ../../node_modules/three/build/three.min.js
//@prepros-prepend ../../node_modules/aos/dist/aos.js
//@prepros-prepend ../../node_modules/modernizr/bin/modernizr.js
//@prepros-prepend orbit-controls.js
//@prepros-prepend mesh-line.js
//@prepros-prepend globe.js
//@prepros-prepend image-picker.js

// whitepaper
function whitepaper() {
  if (!$('#home').length) return
  var WP_DATE = moment('2018-05-01', 'YYYY-MM-DD')
  var WP_DEADLINE = WP_DATE.format('MMM Do, YYYY')
  $('#wpdate').text(WP_DEADLINE)
  var $day = $('#wpday')
  var $hour = $('#wphour')
  var $min = $('#wpmin')
  var $sec = $('#wpsec')
  var tick = function() {
    var now = moment()
    var diff = WP_DATE.diff(now)
    $day.text(~~(diff / 86400000))
    $hour.text(~~(diff % 86400000 / 3600000))
    $min.text(~~(diff % 3600000 / 60000))
    $sec.text(~~(diff % 60000 / 1000))
  }
}

// scrolling
var didScroll
var lastScrollTop = 0
var delta = 5
function scroller() {
  didScroll = true
}
setInterval(function() {
  if (didScroll) {
    hasScrolled()
    didScroll = false
  }
}, 250)

// ui

function hasScrolled() {
  var height = $('#top-bar').outerHeight()
  var top = $(this).scrollTop()
  if (Math.abs(lastScrollTop - top) <= delta) return
  if (top > lastScrollTop && top > height)
    $('#top-bar').removeClass('down').addClass('up')
  else if (top + $(window).height() < $(document).height())
    $('#top-bar').removeClass('up').addClass('down')
  lastScrollTop = top
}

function aosing() {
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

function pickers() {
  if ($.fn.giaImagePicker) {
    $('.image-picker').giaImagePicker()
  }
}

function toc() {
  var toc = $('.toc')
  if (!toc.length) return
  var document = $('.document')
  // get all sections h1
  var sections = document.find('.section')
  var h1s = $('<ul></ul>')
  sections.each(function (i, e) {
    var title = $(e).find('h1')
    var id = 'wps-' + (i + 1)
    title.attr('id', id)
    var a = $('<a></a>')
    var li = $('<li></li>')
    a.html(title.html())
    a.attr('href', '#' + id)
    li.append(a)
    // get all h2
    var children = $(e).find('h2')
    if (children.length) {
      var h2s = $('<ul></ul>')
      children.each(function (j, f) {
        var _title = $(f)
        var _id = id + '-' + (j + 1)
        var _li = $('<li></li>')
        var _a = $('<a></a>')
        _title.attr('id', _id)
        _a.html(_title.html())
        _a.attr('href', '#' + _id)
        _li.append(_a)
        h2s.append(_li)
      })
      li.append(h2s)
    }
    h1s.append(li)
  })
  toc.children().remove()
  toc.append(h1s)
}

// preload
function loader() {
  setTimeout(function() {
    var preload = $('#preload')
    var home = $('#home')
    if (preload.length) preload.fadeOut('slow')
    if (home.length && globe) globe()
    if (aosing) aosing()
  }, 0)
}

// bind

$(window)
  .on('load', loader)
  .scroll(scroller)
$(document).ready(function() {
  menu()
  whitepaper()
  toc()
  pickers()
})