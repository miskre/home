(function(){var n,o,r,a,l,e,t,s,u;l=moment("2018-05-01","YYYY-MM-DD"),n=o=r=a=null,u=function(){var e;return e=l.format("MMM Do, YYYY"),$("#wpdate").text(e),n=$("#wpday"),o=$("#wphour"),r=$("#wpmin"),a=$("#wpsec"),setInterval(function(){var e,t;return t=moment(),e=l.diff(t),n.text(~~(e/864e5)),o.text(~~(e%864e5/36e5)),r.text(~~(e%36e5/6e4)),a.text(~~(e%6e4/1e3))},1e3),null},s=function(){return $(".bio-modal").remodal({hashTracking:!1,closeOnEscape:!0,closeOnOutsideClick:!0})},t=function(){var o,r;return o=$("#menu"),(r=$("#top-bar .menu")).click(function(e){return e.preventDefault(),o.hasClass("h")?(o.removeClass("h").hide().fadeIn("fast"),r.addClass("opened"),$("html, body").addClass("no-scroll")):(o.fadeOut("fast",function(){return o.addClass("h")}),r.removeClass("opened"),$("html, body").removeClass("no-scroll"))}),$(o).on("click",".navigations a",function(e){var t,n;return o.fadeOut("fast",function(){return $("html, body").removeClass("no-scroll"),o.addClass("h")}),r.removeClass("opened"),n=$(e.target).attr("href"),t=$(n),$("html, body").animate({scrollTop:t.offset().top},1e3)})},e=function(){if(AOS)return AOS.init({duration:500})},$(window).on("load",function(){return setTimeout(function(){if($("#preload").fadeOut("slow"),e(),globe)return globe()},3e3)}),$(document).ready(function(){return t(),s(),u()})}).call(this);