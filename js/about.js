/* 
----------------- 
About Scroll 
----------------- 
*/

// lazy-load for about section rows
document.addEventListener('DOMContentLoaded', () => {
    const aboutEls = document.querySelectorAll(
        '.about__row, .about__headline-row, .about__closing'
    );
    if (!aboutEls.length) return;
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
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
    aboutEls.forEach((el) => observer.observe(el));
});