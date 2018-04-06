

WP_DATE = moment '2018-05-01', 'YYYY-MM-DD'
$day = $hour = $min = $sec = null

whitepaper = () ->
  WP_DEADLINE = WP_DATE.format 'MMM Do, YYYY'
  $ '#wpdate'
    .text WP_DEADLINE
  $day = $ '#wpday'
  $hour = $ '#wphour'
  $min = $ '#wpmin'
  $sec = $ '#wpsec'
  tick = () ->
    now = moment()
    diff = WP_DATE.diff now
    $day.text ~~ (diff / 86400000)
    $hour.text ~~ (diff % 86400000 / 3600000)
    $min.text ~~ (diff % 3600000 / 60000)
    $sec.text ~~ (diff % 60000 / 1000)
  setInterval tick, 1000
  null

remodal = () ->
  $ '.bio-modal'
    .remodal
      hashTracking: false
      closeOnEscape: true
      closeOnOutsideClick: true

menu = () ->
  section = $ '#menu'
  toggle = $ '#top-bar .menu'
  toggle
    .click (e) ->
      e.preventDefault()
      if section.hasClass 'h'
        section
          .removeClass 'h'
          .hide()
          .fadeIn 'fast'
        toggle.addClass 'opened'
        $ 'html, body'
          .addClass 'no-scroll'
      else
        section.fadeOut 'fast', () ->
          section.addClass 'h'
        toggle.removeClass 'opened'
        $ 'html, body'
          .removeClass 'no-scroll'
  $ section
    .on 'click', '.navigations a', (e) ->
      section.fadeOut 'fast', () ->
        $ 'html, body'
          .removeClass 'no-scroll'
        section.addClass 'h'
      toggle.removeClass 'opened'
      link = $ e.target
        .attr 'href'
      element = $ link
      $ 'html, body'
        .animate
            scrollTop: element.offset().top
          , 1000

animations = () ->
  if AOS then AOS.init
    duration: 500

$ window
  .on 'load', () ->
    setTimeout () ->
        $ '#preload'
          .fadeOut 'slow'
        animations()
        if globe then globe()
      , 3000

$ document
  .ready () ->
    menu()
    remodal()
    whitepaper()