(function($) {

  $(document).ready(function(){
    $('.con').on('click', function() {
      toggleNavigation($(this), $('.nav-pane'));
    });

    function toggleNavigation(btn, nav) {
      btn.toggleClass('open');
      nav.toggleClass('open');
    }
  });

})(jQuery);
