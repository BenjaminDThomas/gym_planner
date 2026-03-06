/* 
----------------- 
About Scroll 
----------------- 
*/

/* lazy-load for about section rows */
(function () {
    'use strict';
    if (!document.querySelector('.about')) return;
    document.addEventListener('DOMContentLoaded', function () {
        var aboutEls = document.querySelectorAll(
            '.about__row, .about__headline-row, .about__closing'
        );
        if (!aboutEls.length) return;
        /* fallback for browsers without IntersectionObserver */
        if (!('IntersectionObserver' in window)) {
            aboutEls.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target); /* only loads once */
                    }
                });
            },
            {
                threshold: 0.15, /* trigger when 15% of element is visible */
            }
        );
        aboutEls.forEach(function (el) { observer.observe(el); });
    });
})();