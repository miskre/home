//@prepros-prepend image-picker.js

// whitepaper
function whitepaper() {
  if (!$('#home').length) return
  var WP_DATE = moment('2018-09-30', 'YYYY-MM-DD')
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
  setInterval(tick, 1000)
}

// scrolling
var didScroll = false
var lastScrollTop = 0
var delta = 5
function scroller() {
  didScroll = true
}
function header() {
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
  setInterval(function() {
    if (didScroll) {
      hasScrolled()
      didScroll = false
    }
  }, 250)
}

// ui

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
  section.on('click', '.navigations a', function(e) {
    section.fadeOut('fast', function() {
      $('html, body').removeClass('no-scroll')
      section.addClass('h')
    })
    toggle.removeClass('opened')
    link = $(e.target).attr('href')
    if (link.startsWith('#')) {
      element = $(link)
      $('html, body').animate({
        scrollTop: element.offset().top
      }, 1000)
    }
  })
}

function pickers() {
  if ($.fn.giaImagePicker) {
    $('.image-picker').giaImagePicker()
  }
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
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
    // var id = 'wps-' + (i + 1)
    var id = slugify(title.text().trim())
    title.attr('id', id)
    var a = $('<a></a>')
    var li = $('<li></li>')
    a.html(title.html())
    a.attr('href', '#' + id)
    a.addClass('anchor')
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
  toc.children(':not(.download)').remove()
  toc.append(h1s)
  if (toc.scrollToFixed && window.innerWidth > 640)
    toc.scrollToFixed({
      marginTop: 150,
      limit: function() {
        var docTop = $('.document').scrollTop()
        var docHeight = $('.document').height()
        return docTop + docHeight - 350
      },
      dontCheckForPositionFixedSupport: true
    })
  toc.on('click', 'a.anchor', function(ev) {
    ev.preventDefault()
    var target = $($(ev.currentTarget).attr('href'))
    if (!target.length) return
    var from = $('html').scrollTop()
    var to = target.offset().top - 150
    var delta = Math.abs(from - to)
    $('html, body').animate({
      scrollTop: to
    }, delta / 5)
  })
}

// preload
function loader() {
  setTimeout(function() {
    var preload = $('#preload')
    var home = $('#home')
    if (preload.length) preload.fadeOut('slow')
    if (home.length && THREE && globe) {
      try {
        globe()
      } catch (e) {
        console.error('WebGL not supported. Please use a browser that supports WebGL.');
      }
    }
    if (aosing) aosing()
  }, 0)
}

// bind

$(window)
  .on('load', loader)
  .scroll(scroller)
$(document).ready(function() {
  menu()
  header()
  whitepaper()
  toc()
  pickers()
})
