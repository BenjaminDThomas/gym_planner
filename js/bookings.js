(function () {
  'use strict';
  
  document.addEventListener('DOMContentLoaded', function () {
    var selectedTrainer = -1;
    var selectedDate    = null;
    var selectedTime    = null;
    var currentWeek     = 0;

    /* 
    ----------------- 
    Trainer Carousel
    ----------------- 
    */

    var carousel = document.getElementById('trainerCarousel');
    var track    = document.getElementById('trainerTrack');
    var dots     = document.querySelectorAll('.trainer-dot');
    var cards    = document.querySelectorAll('.trainer-card');
    if (!carousel || !track || cards.length === 0) return;
    var currentSlide = 0;
    var isDragging   = false;
    var dragStartX   = 0;
    var dragDelta    = 0;
    /* move carousel to a specific slide */
    function goToSlide(idx) {
      currentSlide = idx;
      var cardWidth = cards[0].offsetWidth + 16; /* 16px = 1rem gap */
      track.style.transform = 'translateX(-' + (idx * cardWidth) + 'px)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    }
    /* dot navigation */
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        goToSlide(parseInt(dot.dataset.index, 10));
      });
    });
    /* select or deselect a trainer */
    function selectTrainer(idx) {
      if (selectedTrainer === idx) {
        selectedTrainer = -1;
        cards[idx].classList.remove('selected');
        return;
      }
      cards.forEach(function (c) { c.classList.remove('selected'); });
      selectedTrainer = idx;
      cards[idx].classList.add('selected');
    }
    /* card click */
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        if (Math.abs(dragDelta) > 5) return;
        selectTrainer(parseInt(card.dataset.trainer, 10));
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectTrainer(parseInt(card.dataset.trainer, 10));
        }
      });
    });
    /* min-width: 600px validator*/
    function isDesktop() { return window.innerWidth >= 600; }
    /* mouse drag, mobile only */
    carousel.addEventListener('mousedown', function (e) {
      if (isDesktop()) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragDelta  = 0;
    });
    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      dragDelta = e.clientX - dragStartX;
    });
    document.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      if (dragDelta < -50 && currentSlide < cards.length - 1) goToSlide(currentSlide + 1);
      if (dragDelta > 50  && currentSlide > 0)                goToSlide(currentSlide - 1);
    });
    /* touch swipe, mobile only */
    carousel.addEventListener('touchstart', function (e) {
      if (isDesktop()) return;
      dragStartX = e.touches[0].clientX;
      dragDelta  = 0;
    }, { passive: true });
    carousel.addEventListener('touchmove', function (e) {
      if (isDesktop()) return;
      dragDelta = e.touches[0].clientX - dragStartX;
    }, { passive: true });
    carousel.addEventListener('touchend', function () {
      if (isDesktop()) return;
      if (dragDelta < -50 && currentSlide < cards.length - 1) goToSlide(currentSlide + 1);
      if (dragDelta > 50  && currentSlide > 0)                goToSlide(currentSlide - 1);
    });
    /* 
    ----------------- 
    Date Picker 
    ----------------- 
    */

    var dateGrid = document.getElementById('dateGrid');
    var datePrev = document.getElementById('datePrev');
    var dateNext = document.getElementById('dateNext');
    var MAX_WEEKS = 4;
    var dayNames   = ['Mon','Tue','Wed','Thu','Fri'];
    var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    /* return a new date */
    function addDays(date, days) {
      var d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    }
    /* return the Monday of the week containing the date */
    function getMondayOf(date) {
      var d   = new Date(date);
      var day = d.getDay();
      var diff = (day === 0) ? 1 : (day === 1 ? 0 : -(day - 1));
      d.setDate(d.getDate() + diff);
      return d;
    }
    var today          = new Date();
    today.setHours(0, 0, 0, 0);
    var firstAvailable = addDays(today, 1);
    var baseMonday     = getMondayOf(firstAvailable);
    /* render Mon–Fri chips for the current week */
    function renderWeek() {
      dateGrid.innerHTML = '';
      var weekStart = addDays(baseMonday, currentWeek * 7);
      for (var i = 0; i < 5; i++) {
        var day    = addDays(weekStart, i);
        var isPast = day < firstAvailable;
        var chip = document.createElement('button');
        chip.className = 'date-chip';
        chip.disabled  = isPast;
        if (isPast) chip.style.opacity = '0.35';
        if (selectedDate && day.toDateString() === selectedDate.toDateString()) {
          chip.classList.add('selected');
        }
        chip.innerHTML =
          '<span class="date-chip-day">'   + dayNames[i]              + '</span>' +
          '<span class="date-chip-num">'   + day.getDate()            + '</span>' +
          '<span class="date-chip-month">' + monthNames[day.getMonth()] + '</span>';
        /* capture day */
        (function (d) {
          chip.addEventListener('click', function () {
            if (chip.disabled) return;
            selectedDate = (selectedDate && d.toDateString() === selectedDate.toDateString()) ? null : d;
            renderWeek();
          });
        })(day);
        dateGrid.appendChild(chip);
      }
      datePrev.disabled = (currentWeek === 0);
      dateNext.disabled = (currentWeek >= MAX_WEEKS - 1);
    }
    datePrev.addEventListener('click', function () {
      if (currentWeek > 0) { currentWeek--; renderWeek(); }
    });
    dateNext.addEventListener('click', function () {
      if (currentWeek < MAX_WEEKS - 1) { currentWeek++; renderWeek(); }
    });
    renderWeek();

    /* 
    ----------------- 
    Time Slots 
    ----------------- 
    */

    var timeChips = document.querySelectorAll('.time-chip');
    timeChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var t = chip.dataset.time;
        if (selectedTime === t) {
          selectedTime = null;
          chip.classList.remove('selected');
        } else {
          timeChips.forEach(function (c) { c.classList.remove('selected'); });
          selectedTime = t;
          chip.classList.add('selected');
        }
      });
    });

    /* 
    ----------------- 
    Email Validation 
    ----------------- 
    */

    var emailInput = document.getElementById('emailInput');
    var emailError = document.getElementById('emailError');
    function isValidEmail(val) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || '').trim());
    }
    /* show error if invalid */
    emailInput.addEventListener('blur', function () {
      if (emailInput.value && !isValidEmail(emailInput.value)) {
        emailInput.classList.add('error');
        emailError.classList.add('visible');
      } else {
        emailInput.classList.remove('error');
        emailError.classList.remove('visible');
      }
    });
    /* clear error for valid values */
    emailInput.addEventListener('input', function () {
      if (isValidEmail(emailInput.value)) {
        emailInput.classList.remove('error');
        emailError.classList.remove('visible');
      }
    });

    /* 
    ----------------- 
    Confirm + Modal 
    ----------------- 
    */

    var confirmBtn    = document.getElementById('confirmBtn');
    var modalOverlay  = document.getElementById('modalOverlay');
    var modalBody     = document.getElementById('modalBody');
    var modalClose    = document.getElementById('modalClose');
    var trainerNames  = ['Jonathon Jones', 'Sarah Chambers'];
    /* return number with e.g. 1st, 2nd, 3rd */
    function ordinal(n) {
      var s = ['th', 'st', 'nd', 'rd'];
      var v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    confirmBtn.addEventListener('click', function () {
      var errors = [];
      if (selectedTrainer === -1) errors.push('Please select a personal trainer.');
      if (!selectedDate)          errors.push('Please select a date.');
      if (!selectedTime)          errors.push('Please select a time.');
      if (!emailInput.value) {
        errors.push('Please enter your email address.');
      } else if (!isValidEmail(emailInput.value)) {
        emailInput.classList.add('error');
        emailError.classList.add('visible');
        errors.push('Please enter a valid email address.');
      }
      if (errors.length) { alert(errors.join('\n')); return; }
      var d       = selectedDate;
      var dowText = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      var dateStr = dowText + ' ' + monthNames[d.getMonth()] + ' ' + ordinal(d.getDate());
      modalBody.innerHTML =
        'Your session has been booked for<br>' +
        '<strong>' + dateStr + ' · ' + selectedTime + '</strong><br>' +
        'with <strong>' + trainerNames[selectedTrainer] + '</strong>.<br><br>' +
        'A confirmation email has been sent to<br>' +
        '<strong>' + emailInput.value.trim() + '</strong>.<br><br>' +
        'We look forward to seeing you then.';
      modalOverlay.classList.add('visible');
    });
    /* close modal on button click */
    modalClose.addEventListener('click', function () {
      modalOverlay.classList.remove('visible');
    });
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) modalOverlay.classList.remove('visible');
    });
  });
})();