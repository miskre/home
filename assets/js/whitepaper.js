//@prepros-prepend ../../node_modules/jquery/dist/jquery.min.js
//@prepros-prepend ../../node_modules/remodal/dist/remodal.min.js
//@prepros-prepend ../../node_modules/slick-carousel/slick/slick.min.js
//@prepros-prepend ../../node_modules/aos/dist/aos.js
//@prepros-prepend ./image-picker.js

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

$(document).ready(function() {
  menu()
  animations()
  toc()
  pickers()
})