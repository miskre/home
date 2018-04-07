
class GiaImagePicker

  element: null
  options:
    fileInputSelector: '> input[type=file]'
    clearButtonSelector: '+ a.image-picker-cancel'
    onChanged: null
    onCleared: null

  constructor: (element, options) ->
    @element = element
    @options = $.extend @options, options
    @bind()

  onChanged: (e) =>
    input = e.target
    if input.files and input.files[0]
      reader = new FileReader()
      reader.onload = (e) =>
        a = $ @element
          .css 'background-image', "url(#{e.target.result})"
          .addClass 'removable'
      reader.readAsDataURL input.files[0]
      if typeof @options.onChanged is 'function'
        @options.onChanged e

  onCleared: (e) =>
    e.preventDefault()
    noImage = $ @element
      .attr 'data-no-image'
    unless noImage? then noImage = 'none'
    $ @element
      .css 'background-image', noImage
      .removeClass 'removable'
    if typeof @options.onCleared is 'function'
        @options.onCleared e

  bind: () ->
    $ @element
      .find @options.fileInputSelector
        .unbind 'change'
        .change @onChanged
        .end()
      .find @options.clearButtonSelector
        .unbind 'click'
        .click @onCleared
        .end()

if $?

  $.fn.giaImagePicker = (options) ->
    for e in @
      new GiaImagePicker e, options
