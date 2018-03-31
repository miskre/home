WP_DATE = moment '2018-03-01', 'YYYY-MM-DD'
$day = $hour = $min = $sec = null

whitepaper = () ->
  WP_DEADLINE = WP_DATE.format 'MMM Do, YYYY'
      .toLowerCase()
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

hero = () ->
  $ '#header .hero .stamp'
    .click (e) ->
      tag = $ e.delegateTarget
        .attr 'id'
      $ '#header .hero'
        .addClass 'expanded'
        .find '.info'
        .click () ->
          $ '#header .hero'
            .removeClass 'expanded'
        .find '> *'
        .addClass 'h'
        .filter "[for=#{tag}]"
        .removeClass 'h'

timeline = () ->
  $ '#progress .timeline ul'
    .bxSlider
      infiniteLoop: false
      pager: true
      controls: false
      auto: true
      autoStart: true
      pause: 4000

menu = () ->
  section = $ '#menu'
  toggle = $ '.menu-toggle'
  toggle
    .click () ->
      if section.hasClass 'h'
        section
          .removeClass 'h'
          .hide()
          .fadeIn 'fast'
        toggle.addClass 'opened'
      else
        section.fadeOut 'fast', () ->
          section.addClass 'h'
        toggle.removeClass 'opened'
  $ '#menu .navigations a'
    .click (e) ->
      section.fadeOut 'fast', () ->
        section.addClass 'h'
      toggle.removeClass 'opened'
      link = $ e.target
        .attr 'href'
      element = $ link
      $ 'html, body'
        .animate
            scrollTop: element.offset().top
          , 1000

remodal = () ->
  $ '.bio-modal'
    .remodal
      hashTracking: false
      closeOnEscape: true
      closeOnOutsideClick: true

$ document
  .ready () ->
    menu()
    hero()
    timeline()
    whitepaper()
    remodal()