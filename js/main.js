/*
-----------
Navbar Mobile Hamburger Toggle
-----------
*/

(function () {'use strict';
  /* gets elements */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  /* toggle open / closed */
  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('is-open');
    /* swap icon when closed to hamburger and X when open */
    hamburger.innerHTML = isOpen ? '&#10005;' : '&#9776;';
    /* update aria-expanded */
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    /* prevent scrolling while menu is open */
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  /* close when menu link is clicked */
  var menuLinks = mobileMenu.querySelectorAll('a');
  menuLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
  /* disapear when viewport is resized back to desktop */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) {
      closeMenu();
    }
  });
  /* closes when navbar link is clicked */
  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    hamburger.innerHTML = '&#9776;';
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
    document.body.style.overflow = '';
  }
})();