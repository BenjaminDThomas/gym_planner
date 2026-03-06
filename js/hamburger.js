/*
-----------
Navbar Mobile Hamburger Toggle + Smooth Scroll
-----------
*/

(function () { 'use strict';

  /* gets elements */
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  /* safe on pages without a nav */
  if (!hamburger || !mobileMenu) return;

  /* toggle open / closed */
  hamburger.addEventListener('click', function () {
    const isOpen = mobileMenu.classList.toggle('is-open');
    /* swap icon — hamburger when closed, X when open */
    hamburger.innerHTML = isOpen ? '&#10005;' : '&#9776;';
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

  /* disappear when viewport is resized back to desktop */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth > 768) closeMenu();
    }, 100);
  });

  /* closes menu and resets state */
  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    hamburger.innerHTML = '&#9776;';
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
    document.body.style.overflow = '';
  }

  /*
  -----------
  Smooth Scroll
  -----------
  */

  /* reads nav height from css */
  function getNavH() {
    return parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
    ) || 76;
  }
  /* scrolls smoothly to target */
  function smoothScrollTo(target) {
    /* pre-reveal lazy-load elements before scroll */
    target.querySelectorAll(
      '.about__row, .about__headline-row, .about__closing'
    ).forEach(function (el) { el.classList.add('is-visible'); });
    requestAnimationFrame(function () {
      var top = target.getBoundingClientRect().top + window.scrollY - getNavH() - 8;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  }
  /* closes when navbar link is clicked */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href === '#') return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    /* close mobile menu first if open, then scroll */
    if (mobileMenu.classList.contains('is-open')) {
      closeMenu();
      setTimeout(function () { smoothScrollTo(target); }, 60);
    } else {
      smoothScrollTo(target);
    }
  });
})();