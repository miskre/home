function whitepaper(){if($("#home").length){var n=moment("2018-07-10","YYYY-MM-DD"),e=n.format("MMM Do, YYYY");$("#wpdate").text(e);var o=$("#wpday"),a=$("#wphour"),l=$("#wpmin"),r=$("#wpsec");setInterval(function(){var e=moment(),t=n.diff(e);o.text(~~(t/864e5)),a.text(~~(t%864e5/36e5)),l.text(~~(t%36e5/6e4)),r.text(~~(t%6e4/1e3))},1e3)}}function scroller(){didScroll=!0}function header(){setInterval(function(){didScroll&&(!function(){var e=$("#top-bar").outerHeight(),t=$(this).scrollTop();Math.abs(lastScrollTop-t)<=delta||(lastScrollTop<t&&e<t?$("#top-bar").removeClass("down").addClass("up"):t+$(window).height()<$(document).height()&&$("#top-bar").removeClass("up").addClass("down"),lastScrollTop=t)}(),didScroll=!1)},250)}function aosing(){AOS&&AOS.init({duration:500})}function menu(){var t=$("#menu"),n=$("#top-bar .menu");n.click(function(e){e.preventDefault(),t.hasClass("h")?(t.removeClass("h").hide().fadeIn("fast"),n.addClass("opened"),$("html, body").addClass("no-scroll")):(t.fadeOut("fast",function(){t.addClass("h")}),n.removeClass("opened"),$("html, body").removeClass("no-scroll"))}),t.on("click",".navigations a",function(e){t.fadeOut("fast",function(){$("html, body").removeClass("no-scroll"),t.addClass("h")}),n.removeClass("opened"),link=$(e.target).attr("href"),link.startsWith("#")&&(element=$(link),$("html, body").animate({scrollTop:element.offset().top},1e3))})}function pickers(){$.fn.giaImagePicker&&$(".image-picker").giaImagePicker()}function slugify(e){return e.toString().toLowerCase().replace(/\s+/g,"-").replace(/[^\w\-]+/g,"").replace(/\-\-+/g,"-").replace(/^-+/,"").replace(/-+$/,"")}function toc(){var e=$(".toc");if(e.length){var t=$(".document").find(".section"),s=$("<ul></ul>");t.each(function(e,t){var n=$(t).find("h1"),r=slugify(n.text().trim());n.attr("id",r);var o=$("<a></a>"),a=$("<li></li>");o.html(n.html()),o.attr("href","#"+r),o.addClass("anchor"),a.append(o);var l=$(t).find("h2");if(l.length){var i=$("<ul></ul>");l.each(function(e,t){var n=$(t),o=r+"-"+(e+1),a=$("<li></li>"),l=$("<a></a>");n.attr("id",o),l.html(n.html()),l.attr("href","#"+o),a.append(l),i.append(a)}),a.append(i)}s.append(a)}),e.children(":not(.download)").remove(),e.append(s),e.scrollToFixed&&640<window.innerWidth&&e.scrollToFixed({marginTop:150,limit:function(){return $(".document").scrollTop()+$(".document").height()-350},dontCheckForPositionFixedSupport:!0}),e.on("click","a.anchor",function(e){e.preventDefault();var t=$($(e.currentTarget).attr("href"));if(t.length){var n=$("html").scrollTop(),o=t.offset().top-150,a=Math.abs(n-o);$("html, body").animate({scrollTop:o},a/5)}})}}function loader(){setTimeout(function(){var e=$("#preload"),t=$("#home");if(e.length&&e.fadeOut("slow"),t.length&&THREE&&globe)try{globe()}catch(e){console.error("WebGL not supported. Please use a browser that supports WebGL.")}aosing&&aosing()},0)}(function(){var l,n=function(e,t){return function(){return e.apply(t,arguments)}};l=function(){function e(e,t){this.onCleared=n(this.onCleared,this),this.onChanged=n(this.onChanged,this),this.element=e,this.options=$.extend(this.options,t),this.bind()}return e.prototype.element=null,e.prototype.options={fileInputSelector:"> input[type=file]",clearButtonSelector:"+ a.image-picker-cancel",onChanged:null,onCleared:null},e.prototype.onChanged=function(e){var t,n,o;if((t=e.target).files&&t.files[0]&&((n=new FileReader).onload=(o=this,function(e){return $(o.element).css("background-image","url("+e.target.result+")").addClass("removable")}),n.readAsDataURL(t.files[0]),"function"==typeof this.options.onChanged))return this.options.onChanged(e)},e.prototype.onCleared=function(e){var t;if(e.preventDefault(),null==(t=$(this.element).attr("data-no-image"))&&(t="none"),$(this.element).css("background-image",t).removeClass("removable"),"function"==typeof this.options.onCleared)return this.options.onCleared(e)},e.prototype.bind=function(){return $(this.element).find(this.options.fileInputSelector).unbind("change").change(this.onChanged).end().find(this.options.clearButtonSelector).unbind("click").click(this.onCleared).end()},e}(),"undefined"!=typeof $&&null!==$&&($.fn.giaImagePicker=function(e){var t,n,o,a;for(a=[],n=0,o=this.length;n<o;n++)t=this[n],a.push(new l(t,e));return a})}).call(this);var didScroll=!1,lastScrollTop=0,delta=5;$(window).on("load",loader).scroll(scroller),$(document).ready(function(){menu(),header(),whitepaper(),toc(),pickers()});