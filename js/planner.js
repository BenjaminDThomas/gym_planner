/* 
----------------- 
State 
----------------- 
*/
var workouts = [], sessions = [], currentSessionIdx = 0, editingWorkoutId = null;
var csAssignments = {}, csWeekOffset = 0, addedToSession = {}, csMonthOffset = 0;
var csSelectedWeekInMonth = null;  /* monday of selected week */
var DAYS   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* 
----------------- 
Storage
----------------- 
*/
/* save all state to localStorage */
function saveToStorage() {
  try {
    localStorage.setItem('planner_workouts',       JSON.stringify(workouts));
    localStorage.setItem('planner_sessions',       JSON.stringify(sessions));
    localStorage.setItem('planner_addedToSession', JSON.stringify(addedToSession));
  } catch(e) { /* quota exceeded – silently ignore */ }
}
/* restore state from localStorage on page load */
function loadFromStorage() {
  try {
    var w = localStorage.getItem('planner_workouts');
    var s = localStorage.getItem('planner_sessions');
    var a = localStorage.getItem('planner_addedToSession');
    if (w) workouts       = JSON.parse(w);
    if (s) sessions       = JSON.parse(s);
    if (a) addedToSession = JSON.parse(a);
  } catch(e) { workouts = []; sessions = []; addedToSession = {}; }
}

/* 
----------------- 
Utilities 
----------------- 
*/
/* generate unique id */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
/* show slide-up toast */
function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}
/* switch visible page and highlight sidebar */
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.sidebar-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.page === pageId);
  });
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
/* return new date set to monday of the week */
function getMonday(d) {
  var c = new Date(d); c.setHours(0,0,0,0);
  var day = c.getDay();
  c.setDate(c.getDate() - day + (day === 0 ? -6 : 1));
  return c;
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
/* monday of the current calendar week */
function getThisMonday() { return getMonday(new Date()); }
function fmtDate(d) { return pad(d.getDate()) + ' ' + MONTHS[d.getMonth()].slice(0,3); }
function weekRangeLabel(mondayDate) {
  var sun = new Date(mondayDate); sun.setDate(sun.getDate() + 6);
  return 'Mon ' + fmtDate(mondayDate) + ' - Sun ' + fmtDate(sun) + ' ' + sun.getFullYear();
}

/* 
----------------- 
Sidebar Navigation 
----------------- 
*/
/* sidebar page buttons */
document.querySelectorAll('.sidebar-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var page = btn.dataset.page;
    navigateTo(page);
    if (page === 'my-workouts')    renderWorkoutList();
    if (page === 'my-sessions')    renderSessionsView();
    if (page === 'dashboard')      renderDashboard();
    if (page === 'create-session') { renderCsWorkoutPool(); renderCsDayList(); }
  });
});
/* dashboard quick-action: create workout */
document.getElementById('dashCreateWorkout').addEventListener('click', function() {
  startCreateWorkout();
  navigateTo('create-workout');
  document.querySelectorAll('.sidebar-btn').forEach(function(b) { b.classList.remove('active'); });
});
/* dashboard quick-action: create session */
document.getElementById('dashCreateSession').addEventListener('click', function() {
  initCreateSession();
  navigateTo('create-session');
  document.querySelectorAll('.sidebar-btn').forEach(function(b) { b.classList.remove('active'); });
});
/* new workout button */
document.getElementById('newWorkoutBtn').addEventListener('click', function() {
  startCreateWorkout(); navigateTo('create-workout');
});
/* create session button */
document.getElementById('createSessionBtn').addEventListener('click', function() {
  initCreateSession(); navigateTo('create-session');
});

/* 
----------------- 
Mobile Menu 
----------------- 
*/
/* toggle mobile nav overlay when hamburger is clicked */
(function() {
  var hamburger  = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;
  hamburger.addEventListener('click', function() {
    var isOpen = mobileMenu.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.innerHTML = isOpen ? '&#x2715;' : '&#9776;';
    /* prevent scroll while menu is open */
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  /* close menu when a link is clicked */
  mobileMenu.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      mobileMenu.classList.remove('is-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.innerHTML = '&#9776;';
      document.body.style.overflow = '';
    });
  });
})();
/* toggle planner sidebar on mobile */
(function() {
  var toggleBtn = document.getElementById('sidebarToggle');
  var sidebar   = document.getElementById('plannerSidebar');
  if (!toggleBtn || !sidebar) return;
  function setOpen(open) {
    sidebar.classList.toggle('is-open', open);
    toggleBtn.classList.toggle('is-open', open);
    toggleBtn.style.left = open ? '140px' : '0';
  }
  toggleBtn.addEventListener('click', function() { setOpen(!sidebar.classList.contains('is-open')); });
  /* close sidebar when nav button is clicked on mobile */
  sidebar.querySelectorAll('.sidebar-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { if (window.innerWidth <= 768) setOpen(false); });
  });
})();

/* 
----------------- 
Profile Picture 
----------------- 
*/
/* open profile modal */
document.getElementById('profileBtn').addEventListener('click', function() {
  document.getElementById('profileModal').classList.add('visible');
});
/* close via cancel button */
document.getElementById('profileModalCancel').addEventListener('click', function() {
  document.getElementById('profileModal').classList.remove('visible');
});
/* close via overlay click */
document.getElementById('profileModal').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('visible');
});
/* select avatar or file upload */
document.querySelectorAll('.profile-option').forEach(function(opt) {
  opt.addEventListener('click', function() {
    var pic = opt.dataset.pic;
    if (pic === 'upload') { document.getElementById('profileFileInput').click(); return; }
    document.getElementById('profileImg').src = pic === 'male'
      ? '../images/profile_picture_male.png'
      : '../images/profile_picture_female.png';
    document.getElementById('profileModal').classList.remove('visible');
    showToast('Profile picture updated!', 'success');
  });
});
/* custom image upload */
document.getElementById('profileFileInput').addEventListener('change', function(e) {
  var file = e.target.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    document.getElementById('profileImg').src = ev.target.result;
    document.getElementById('profileModal').classList.remove('visible');
    showToast('Profile picture updated!', 'success');
  };
  reader.readAsDataURL(file);
});

/* 
----------------- 
Create Workout 
----------------- 
*/
/* set up form for new or edit */
function startCreateWorkout(workoutId) {
  editingWorkoutId = workoutId || null;
  document.getElementById('cwSessionName').value = '';
  document.getElementById('cwPreviewImg').style.display = 'none';
  document.getElementById('cwPreviewImg').src = '';
  document.getElementById('cwUploadArea').style.display = 'flex';
  document.getElementById('cwFileInput').value = '';
  document.getElementById('exerciseEntries').innerHTML = '';
  if (workoutId) {
    var w = workouts.find(function(x) { return x.id === workoutId; });
    if (w) {
      document.getElementById('cwSessionName').value = w.name;
      if (w.imageData) {
        document.getElementById('cwPreviewImg').src = w.imageData;
        document.getElementById('cwPreviewImg').style.display = 'block';
        document.getElementById('cwUploadArea').style.display = 'none';
      }
      w.exercises.forEach(function(ex) { addExerciseEntry(ex); });
    }
  } else { addExerciseEntry(); }
}
/* click to browse */
document.getElementById('cwUploadArea').addEventListener('click', function() {
  document.getElementById('cwFileInput').click();
});
/* drag over highlight */
document.getElementById('cwUploadArea').addEventListener('dragover', function(e) {
  e.preventDefault(); this.style.borderColor = 'var(--accent)';
});
/* drag leave reset */
document.getElementById('cwUploadArea').addEventListener('dragleave', function() {
  this.style.borderColor = '#d0c8c7';
});
/* drop to upload */
document.getElementById('cwUploadArea').addEventListener('drop', function(e) {
  e.preventDefault(); this.style.borderColor = '#d0c8c7';
  var file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadPreviewImage(file);
});
/* file input change */
document.getElementById('cwFileInput').addEventListener('change', function(e) {
  var file = e.target.files[0]; if (file) loadPreviewImage(file);
});
/* load image into preview */
function loadPreviewImage(file) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    document.getElementById('cwPreviewImg').src = ev.target.result;
    document.getElementById('cwPreviewImg').style.display = 'block';
    document.getElementById('cwUploadArea').style.display = 'none';
  };
  reader.readAsDataURL(file);
}
/* add exercise entry button */
document.getElementById('addExerciseBtn').addEventListener('click', function() { addExerciseEntry(); });
/* render one exercise row */
function addExerciseEntry(data) {
  var entry = document.createElement('div');
  entry.className = 'exercise-entry';
  var v = function(f) { return data && data[f] ? escHtml(data[f]) : ''; };
  entry.innerHTML = [
    '<div class="exercise-entry-row">',
      '<span class="form-label">Exercise Name</span>',
      '<input type="text" class="form-input ex-name" placeholder="Enter exercise here..." value="' + v('name') + '">',
      '<button class="delete-exercise-btn" title="Remove exercise">',
        '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
      '</button>',
    '</div>',
    '<div class="reps-sets-row">',
      '<input type="text" class="form-input ex-reps" placeholder="Enter reps..." value="' + v('reps') + '">',
      '<input type="text" class="form-input ex-sets" placeholder="Enter sets..." value="' + v('sets') + '">',
    '</div>',
    '<div class="ex-media-row">',
      '<div class="ex-video-upload">',
        '<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
        '<span>Add video</span>',
        '<input type="file" class="ex-video-input" accept="video/*" style="display:none">',
      '</div>',
      '<div class="ex-video-preview" style="display:none">',
        '<video class="ex-video-player" controls playsinline></video>',
        '<button class="ex-video-remove" title="Remove video">',
          '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        '</button>',
      '</div>',
    '</div>'
  ].join('');
  entry.querySelector('.delete-exercise-btn').addEventListener('click', function() { entry.remove(); });
  /* video upload logic */
  var videoUpload  = entry.querySelector('.ex-video-upload');
  var videoInput   = entry.querySelector('.ex-video-input');
  var videoPreview = entry.querySelector('.ex-video-preview');
  var videoPlayer  = entry.querySelector('.ex-video-player');
  var videoRemove  = entry.querySelector('.ex-video-remove');
  videoUpload.addEventListener('click', function() { videoInput.click(); });
  function loadVideo(file) {
    videoPlayer.src = URL.createObjectURL(file);
    var reader = new FileReader();
    reader.onload = function(ev) { videoPlayer.dataset.base64 = ev.target.result; };
    reader.readAsDataURL(file);
    videoUpload.style.display = 'none'; videoPreview.style.display = 'flex';
  }
  videoInput.addEventListener('change', function(e) { if (e.target.files[0]) loadVideo(e.target.files[0]); });
  videoRemove.addEventListener('click', function() {
    videoPlayer.src = ''; videoPlayer.dataset.base64 = '';
    videoUpload.style.display = 'flex'; videoPreview.style.display = 'none';
    videoInput.value = '';
  });
  /* restore saved video when editing */
  if (data && data.videoData) {
    videoPlayer.src = data.videoData; videoPlayer.dataset.base64 = data.videoData;
    videoUpload.style.display = 'none'; videoPreview.style.display = 'flex';
  }
  document.getElementById('exerciseEntries').appendChild(entry);
}
/* save / update workout */
document.getElementById('saveWorkoutBtn').addEventListener('click', function() {
  var name = document.getElementById('cwSessionName').value.trim();
  if (!name) { showToast('Please enter a workout name.'); return; }
  var entries = document.querySelectorAll('#exerciseEntries .exercise-entry');
  if (entries.length === 0) { showToast('Add at least one exercise.'); return; }
  var exercises = [], valid = true;
  entries.forEach(function(entry) {
    var n = entry.querySelector('.ex-name').value.trim();
    var r = entry.querySelector('.ex-reps').value.trim();
    var s = entry.querySelector('.ex-sets').value.trim();
    var vd = entry.querySelector('.ex-video-player').dataset.base64 || '';
    if (!n) { valid = false; return; }
    exercises.push({ name: n, reps: r, sets: s, videoData: vd });
  });
  if (!valid) { showToast('Please fill in all exercise names.'); return; }
  var imageData = document.getElementById('cwPreviewImg').style.display !== 'none'
    ? document.getElementById('cwPreviewImg').src : '';
  /* workout + exercise names */
  var muscleMap = {
    'push':'Chest, Shoulders, Triceps', 'pull':'Back, Biceps',
    'leg':'Hamstrings, Quads, Calfs',   'abs':'Obliques, Core',
    'chest':'Chest, Shoulders, Triceps','back':'Back, Biceps',
    'squat':'Quads, Glutes',            'deadlift':'Hamstrings, Back'
  };
  var muscles = '';
  var combined = (name + ' ' + exercises.map(function(e) { return e.name; }).join(' ')).toLowerCase();
  Object.keys(muscleMap).forEach(function(k) { if (!muscles && combined.includes(k)) muscles = muscleMap[k]; });
  if (!muscles) muscles = 'Various Muscles';
  if (editingWorkoutId) {
    var idx = workouts.findIndex(function(x) { return x.id === editingWorkoutId; });
    if (idx >= 0) workouts[idx] = { id: editingWorkoutId, name: name, muscles: muscles, exercises: exercises, imageData: imageData };
    showToast('Workout updated!', 'success');
  } else {
    workouts.push({ id: uid(), name: name, muscles: muscles, exercises: exercises, imageData: imageData });
    showToast('Workout saved!', 'success');
  }
  editingWorkoutId = null;
  saveToStorage();
  navigateTo('my-workouts');
  document.querySelectorAll('.sidebar-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.page === 'my-workouts');
  });
  renderWorkoutList();
  renderDashboard();
});

/* 
----------------- 
My Workouts 
----------------- 
*/
/* render the workout list */
function renderWorkoutList() {
  var list  = document.getElementById('workoutList');
  var empty = document.getElementById('workoutsEmpty');
  list.innerHTML = '';
  if (workouts.length === 0) { empty.style.display = 'block'; list.style.display = 'none'; return; }
  empty.style.display = 'none';
  list.style.display  = 'flex';
  workouts.forEach(function(w) {
    var card = document.createElement('div');
    card.className = 'workout-card';
    card.dataset.id = w.id;
    var isAdded = !!addedToSession[w.id];
    var thumbHtml = w.imageData
      ? '<img class="workout-thumb" src="' + w.imageData + '" alt="">'
      : '<div class="workout-thumb-placeholder"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    card.innerHTML = [
      '<div class="workout-drag-handle"><span></span><span></span><span></span></div>',
      thumbHtml,
      '<div class="workout-info">',
        '<div class="workout-title">' + escHtml(w.name) + '</div>',
        '<div class="workout-muscles">' + escHtml(w.muscles) + '</div>',
        '<div class="workout-ex-count">' + w.exercises.length + ' Exercise' + (w.exercises.length !== 1 ? 's' : '') + '</div>',
      '</div>',
      '<div class="workout-actions">',
        '<button class="workout-action-btn edit-workout-btn" title="Edit">',
          '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        '</button>',
        '<button class="workout-action-btn delete-workout-btn" title="Delete">',
          '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
        '</button>',
        '<button class="workout-add-btn ' + (isAdded ? 'added' : '') + '" data-wid="' + w.id + '">',
          isAdded ? '&#x2715;' : '&#x2B;',
        '</button>',
      '</div>'
    ].join('');
    /* click card body to view */
    card.addEventListener('click', function(e) {
      if (!e.target.closest('.workout-actions')) openWorkoutView(w.id);
    });
    /* edit button */
    card.querySelector('.edit-workout-btn').addEventListener('click', function() {
      startCreateWorkout(w.id);
      navigateTo('create-workout');
      document.querySelectorAll('.sidebar-btn').forEach(function(b) { b.classList.remove('active'); });
    });
    /* delete button */
    (function(wId, wName) {
      card.querySelector('.delete-workout-btn').addEventListener('click', function() {
        if (!confirm('Delete "' + wName + '"? This cannot be undone.')) return;
        workouts = workouts.filter(function(x) { return x.id !== wId; });
        delete addedToSession[wId];
        sessions.forEach(function(s) {
          DAYS.forEach(function(day) { if (s.days[day] === wId) delete s.days[day]; });
        });
        saveToStorage(); renderWorkoutList(); renderDashboard();
        showToast('Workout deleted.', 'removed');
      });
    })(w.id, w.name);
    /* add / remove from session */
    card.querySelector('.workout-add-btn').addEventListener('click', function() {
      var btn = this;
      if (addedToSession[w.id]) {
        delete addedToSession[w.id]; btn.classList.remove('added'); btn.innerHTML = '&#x2B;';
        showToast('Removed from session plan!', 'removed');
      } else {
        addedToSession[w.id] = true; btn.classList.add('added'); btn.innerHTML = '&#x2715;';
        showToast('Added to session plan!', 'success');
      }
      saveToStorage();
    });
    list.appendChild(card);
  });
}

/* 
----------------- 
Create Session 
----------------- 
*/
/* reset create session form */
function initCreateSession() {
  csAssignments = {}; csWeekOffset = 0; csMonthOffset = 0; csSelectedWeekInMonth = null;
  var recurring = document.getElementById('csRecurringCheck');
  if (recurring) recurring.checked = false;
  updateCsMonthDisplay(); renderCsWorkoutPool(); renderCsDayList();
}
/* month week-picker */
function updateCsMonthDisplay() {
  var thisMonday = getThisMonday();
  var now = new Date(); now.setHours(0,0,0,0);
  var target = new Date(now.getFullYear(), now.getMonth() + csMonthOffset, 1);
  var yr = target.getFullYear(), mo = target.getMonth();
  /* disable prev arrow on current month */
  document.getElementById('csMonthPrev').disabled = (csMonthOffset <= 0);
  document.getElementById('csMonthLabel').textContent = MONTHS[mo] + ' ' + yr;
  var datesDiv = document.getElementById('csWeekDates');
  datesDiv.innerHTML = '';
  /* first Monday on or before 1st of month */
  var cur = getMonday(new Date(yr, mo, 1));
  while (true) {
    /* stop once passed the end of the month */
    if (cur.getFullYear() > yr || (cur.getFullYear() === yr && cur.getMonth() > mo)) break;
    var wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
    var isPast     = cur < thisMonday;
    var isSelected = csSelectedWeekInMonth && cur.toDateString() === csSelectedWeekInMonth.toDateString();
    var row = document.createElement('div');
    row.style.cssText = 'padding:.25rem .5rem;border-radius:6px;display:flex;justify-content:space-between;align-items:center;'
      + (isPast ? 'opacity:0.4;cursor:not-allowed;' : 'cursor:pointer;')
      + (isSelected ? 'background:var(--accent);color:white;font-weight:700;' : 'transition:background 0.15s;');
    row.textContent = pad(cur.getDate()) + ' ' + MONTHS[cur.getMonth()].slice(0,3)
                    + ' - ' + pad(wEnd.getDate()) + ' ' + MONTHS[wEnd.getMonth()].slice(0,3);
    if (!isPast) {
      (function(ws, sel) {
        row.addEventListener('click', function() {
          csSelectedWeekInMonth = new Date(ws);
          csWeekOffset = Math.round((ws - thisMonday) / (7 * 86400000));
          updateCsMonthDisplay();
        });
        row.addEventListener('mouseenter', function() { if (!sel) this.style.background = 'rgba(152,132,131,0.15)'; });
        row.addEventListener('mouseleave', function() { if (!sel) this.style.background = ''; });
      })(new Date(cur), isSelected);
    }
    datesDiv.appendChild(row);
    cur.setDate(cur.getDate() + 7);
  }
}
/* prev month arrow */
document.getElementById('csMonthPrev').addEventListener('click', function() {
  if (csMonthOffset > 0) { csMonthOffset--; updateCsMonthDisplay(); }
});
/* next month arrow */
document.getElementById('csMonthNext').addEventListener('click', function() { csMonthOffset++; updateCsMonthDisplay(); });
/* render draggable workout */
function renderCsWorkoutPool() {
  var pool = document.getElementById('csWorkoutPool');
  pool.innerHTML = '';
  var addedWorkouts = workouts.filter(function(w) { return !!addedToSession[w.id]; });
  if (workouts.length === 0) {
    pool.innerHTML = '<div class="pool-empty-msg">No workouts created yet — go to <strong>My Workouts</strong> to create one.</div>'; return;
  }
  if (addedWorkouts.length === 0) {
    pool.innerHTML = '<div class="pool-empty-msg">No workouts added yet — go to <strong>My Workouts</strong> and click <strong>+</strong> to add workouts here.</div>'; return;
  }
  addedWorkouts.forEach(function(w) {
    var card = document.createElement('div');
    card.className = 'pool-card'; card.dataset.wid = w.id;
    var thumbHtml = w.imageData
      ? '<img class="pool-thumb" src="' + w.imageData + '" alt="">'
      : '<div class="pool-thumb" style="display:flex;align-items:center;justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    card.innerHTML = [
      '<div class="pool-drag"><span></span><span></span><span></span></div>',
      thumbHtml,
      '<div class="pool-info">',
        '<div class="pool-title">' + escHtml(w.name) + '</div>',
        '<div class="pool-ex">' + w.exercises.length + ' Exercise' + (w.exercises.length !== 1 ? 's' : '') + '</div>',
      '</div>'
    ].join('');
    /* drag to day row */
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', function(e) { e.dataTransfer.setData('text/plain', w.id); card.style.opacity = '0.5'; });
    card.addEventListener('dragend', function() { card.style.opacity = '1'; });
    /* click to auto-assign to next empty day */
    card.addEventListener('click', function() {
      var assigned = false;
      DAYS.forEach(function(day) { if (!assigned && !csAssignments[day]) { csAssignments[day] = w.id; assigned = true; } });
      if (!assigned) showToast('All days filled — remove one first.'); else renderCsDayList();
    });
    pool.appendChild(card);
  });
}
/* render day rows with drag and drop areas */
function renderCsDayList() {
  var list = document.getElementById('csDayList');
  list.innerHTML = '';
  DAYS.forEach(function(day) {
    var row = document.createElement('div');
    row.className = 'cs-day-row'; row.dataset.day = day;
    row.addEventListener('dragover', function(e) {
      e.preventDefault(); row.style.outline = '2px dashed var(--accent)'; row.style.outlineOffset = '-3px';
    });
    row.addEventListener('dragleave', function() { row.style.outline = ''; });
    row.addEventListener('drop', function(e) {
      e.preventDefault(); row.style.outline = '';
      var wid = e.dataTransfer.getData('text/plain');
      if (wid) { csAssignments[day] = wid; renderCsDayList(); }
    });
    var wid = csAssignments[day];
    var w   = wid ? workouts.find(function(x) { return x.id === wid; }) : null;
    /* day label and drag */
    var header = document.createElement('div');
    header.className = 'cs-day-header';
    header.innerHTML = '<span class="cs-day-name">' + day + '</span><div class="cs-drag-handle"><span></span><span></span><span></span></div>';
    row.appendChild(header);
    if (w) {
      /* assigned workout */
      var assigned = document.createElement('div');
      assigned.className = 'cs-day-assigned';
      assigned.innerHTML =
        (w.imageData
          ? '<img class="pool-thumb" style="width:44px;height:36px;border-radius:6px;object-fit:cover;" src="' + w.imageData + '" alt="">'
          : '<div style="width:44px;height:36px;background:#ede6e3;border-radius:6px;flex-shrink:0;"></div>') +
        '<span class="session-title">' + escHtml(w.name) + '</span>' +
        '<span class="session-ex-count">&#9662; ' + w.exercises.length + ' Exercise' + (w.exercises.length !== 1 ? 's' : '') + '</span>' +
        '<button class="cs-remove-btn" data-day="' + day + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
      assigned.querySelector('.cs-remove-btn').addEventListener('click', function(e) {
        e.stopPropagation(); delete csAssignments[day]; renderCsDayList();
      });
      row.appendChild(assigned);
    } else {
      /* empty drop and drag area */
      var zone = document.createElement('div');
      zone.className = 'cs-drop-zone';
      zone.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 16 3 12 7 8"/><polyline points="17 8 21 12 17 16"/></svg> drag a workout here';
      row.appendChild(zone);
    }
    list.appendChild(row);
  });
}
/* save session */
document.getElementById('saveSessionBtn').addEventListener('click', function() {
  var hasAny = Object.keys(csAssignments).length > 0;
  if (!hasAny) { showToast('Assign at least one workout to a day.'); return; }
  var mon = getThisMonday(); mon.setDate(mon.getDate() + csWeekOffset * 7);
  var sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  var recurring   = document.getElementById('csRecurringCheck');
  var isRecurring = recurring && recurring.checked;
  /* full date-range label */
  var label = (isRecurring ? 'Weekly — ' : '') + weekRangeLabel(mon);
  var session = {
    id: uid(), recurring: isRecurring, weekLabel: label,
    weekOffset: csWeekOffset, weekStart: mon.toISOString(), weekEnd: sun.toISOString(),
    days: JSON.parse(JSON.stringify(csAssignments))
  };
  /* replace existing session for same week */
  var existIdx = sessions.findIndex(function(s) { return s.weekOffset === csWeekOffset; });
  if (existIdx >= 0) sessions[existIdx] = session; else sessions.push(session);
  currentSessionIdx = sessions.length - 1;
  saveToStorage();
  showToast('Session saved!', 'success');
  navigateTo('my-sessions');
  document.querySelectorAll('.sidebar-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.page === 'my-sessions');
  });
  renderSessionsView(); renderDashboard();
});

/* 
----------------- 
My Sessions 
----------------- 
*/
/* render current session */
function renderSessionsView() {
  var empty = document.getElementById('sessionsEmpty');
  var view  = document.getElementById('sessionsView');
  if (sessions.length === 0) {
    empty.style.display = 'block'; view.classList.add('sessions-view--hidden'); return;
  }
  empty.style.display = 'none';
  view.classList.remove('sessions-view--hidden');
  if (currentSessionIdx >= sessions.length) currentSessionIdx = sessions.length - 1;
  var sess = sessions[currentSessionIdx];
  /* show full date range */
  document.getElementById('sessionsWeekLabel').textContent =
    sess.weekLabel + ' (' + (currentSessionIdx + 1) + ' / ' + sessions.length + ')';
  var list = document.getElementById('sessionsDayList');
  list.innerHTML = '';
  DAYS.forEach(function(day) {
    var wid = sess.days[day];
    var w   = wid ? workouts.find(function(x) { return x.id === wid; }) : null;
    var row = document.createElement('div');
    row.className = 'session-day-row';
    var contentHtml;
    if (w) {
      var thumbHtml = w.imageData
        ? '<img class="session-thumb" src="' + w.imageData + '" alt="">'
        : '<div style="width:50px;height:42px;border-radius:7px;background:#ede6e3;flex-shrink:0;"></div>';
      contentHtml =
        '<div class="session-day-content">' + thumbHtml +
          '<div class="session-info">' +
            '<div class="session-title">' + escHtml(w.name) + '</div>' +
            '<div class="session-muscles">' + escHtml(w.muscles) + '</div>' +
            '<div class="session-ex-count">&#9662; ' + w.exercises.length + ' Exercise' + (w.exercises.length !== 1 ? 's' : '') + '</div>' +
          '</div></div>';
    } else {
      contentHtml = '<div class="session-day-content"><span class="session-day-empty">No session today</span></div>';
    }
    row.innerHTML = '<div class="session-day-label">' + day + '</div>' + contentHtml;
    if (w) { row.classList.add('session-day-row--clickable'); row.addEventListener('click', function() { openWorkoutView(w.id); }); }
    list.appendChild(row);
  });
}
/* navigate to previous session */
document.getElementById('sessionsPrev').addEventListener('click', function() {
  if (currentSessionIdx > 0) { currentSessionIdx--; renderSessionsView(); }
});
/* navigate to next session */
document.getElementById('sessionsNext').addEventListener('click', function() {
  if (currentSessionIdx < sessions.length - 1) { currentSessionIdx++; renderSessionsView(); }
});
/* delete current session */
document.getElementById('deleteSessionBtn').addEventListener('click', function() {
  if (!sessions.length) return;
  if (confirm('Delete this session?')) {
    sessions.splice(currentSessionIdx, 1);
    if (currentSessionIdx >= sessions.length && currentSessionIdx > 0) currentSessionIdx--;
    saveToStorage(); renderSessionsView(); renderDashboard();
    showToast('Session deleted.', 'removed');
  }
});
/* edit current session */
document.getElementById('editSessionBtn').addEventListener('click', function() {
  if (!sessions.length) return;
  var sess = sessions[currentSessionIdx];
  csAssignments = JSON.parse(JSON.stringify(sess.days));
  csWeekOffset  = sess.weekOffset; csMonthOffset = 0; csSelectedWeekInMonth = null;
  var recurring = document.getElementById('csRecurringCheck');
  if (recurring) recurring.checked = !!sess.recurring;
  sessions.splice(currentSessionIdx, 1);
  saveToStorage(); updateCsMonthDisplay(); renderCsWorkoutPool(); renderCsDayList();
  navigateTo('create-session');
  document.querySelectorAll('.sidebar-btn').forEach(function(b) { b.classList.remove('active'); });
});

/* 
----------------- 
Dashboard 
----------------- 
*/
/* render this week checklist and counter */
function renderDashboard() {
  var checklist  = document.getElementById('dashChecklist');
  var completion = document.getElementById('dashCompletion');
  checklist.innerHTML = '';
  /* find session for the current week */
  var currentSessions = sessions.filter(function(s) { return s.weekOffset === 0; });
  var todaySess = currentSessions.length > 0 ? currentSessions[currentSessions.length - 1] : null;
  if (!todaySess) {
    checklist.innerHTML = '<div class="checklist-item" style="color:var(--text-muted);font-size:0.82rem;font-style:italic;">No sessions scheduled — create one in My Sessions</div>';
    completion.innerHTML = '0 <span>/ 0 Completed</span>'; return;
  }
  /* total days for workouts assigned */
  var total = 0;
  DAYS.forEach(function(day) {
    var wid = todaySess.days[day];
    if (wid && workouts.find(function(x) { return x.id === wid; })) total++;
  });
  if (total === 0) {
    checklist.innerHTML = '<div class="checklist-item" style="color:var(--text-muted);font-size:0.82rem;font-style:italic;">No workouts in this session</div>';
    completion.innerHTML = '0 <span>/ 0 Completed</span>'; return;
  }
  /* stored already-ticked value */
  var checked = 0;
  DAYS.forEach(function(day) {
    var wid = todaySess.days[day];
    if (!wid || !workouts.find(function(x) { return x.id === wid; })) return;
    if (localStorage.getItem('check_' + todaySess.id + '_' + day) === '1') checked++;
  });
  /* render workout counter */
  updateCompletionText(checked, total);
  var abbrevMap = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };
  /* render one checklist row per assigned day */
  DAYS.forEach(function(day) {
    var wid = todaySess.days[day]; if (!wid) return;
    var w = workouts.find(function(x) { return x.id === wid; }); if (!w) return;
    var item = document.createElement('div'); item.className = 'checklist-item';
    var checkBox = document.createElement('div'); checkBox.className = 'check-box';
    checkBox.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
    var key = 'check_' + todaySess.id + '_' + day;
    if (localStorage.getItem(key) === '1') checkBox.classList.add('checked');
    /* tick / untick and update counter */
    checkBox.addEventListener('click', function() {
      checkBox.classList.toggle('checked');
      if (checkBox.classList.contains('checked')) { localStorage.setItem(key, '1'); checked++; }
      else { localStorage.removeItem(key); checked--; }
      updateCompletionText(checked, total);
    });
    var daySpan = document.createElement('span'); daySpan.className = 'checklist-day'; daySpan.textContent = abbrevMap[day];
    var workoutSpan = document.createElement('span'); workoutSpan.className = 'checklist-workout'; workoutSpan.textContent = w.name;
    item.appendChild(checkBox); item.appendChild(daySpan); item.appendChild(workoutSpan);
    checklist.appendChild(item);
  });
}
/* update display */
function updateCompletionText(c, t) {
  document.getElementById('dashCompletion').innerHTML = c + ' <span>/ ' + t + ' Completed</span>';
}

/* 
----------------- 
View Workout Modal 
----------------- 
*/
/* open read-only workout modal */
function openWorkoutView(wId) {
  var w = workouts.find(function(x) { return x.id === wId; });
  if (!w) return;
  var img       = document.getElementById('viewModalImg');
  var nameEl    = document.getElementById('viewModalName');
  var musclesEl = document.getElementById('viewModalMuscles');
  var exList    = document.getElementById('viewModalExercises');
  nameEl.textContent    = w.name;
  musclesEl.textContent = w.muscles;
  if (w.imageData) { img.src = w.imageData; img.style.display = 'block'; }
  else             { img.src = ''; img.style.display = 'none'; }
  exList.innerHTML = '';
  w.exercises.forEach(function(ex, i) {
    var row = document.createElement('div');
    row.className = 'view-ex-row';
    row.innerHTML =
      '<div class="view-ex-num">' + (i + 1) + '</div>' +
      '<div class="view-ex-info">' +
        '<div class="view-ex-name">' + escHtml(ex.name) + '</div>' +
        '<div class="view-ex-meta">' +
          (ex.reps ? '<span>Reps: <strong>' + escHtml(ex.reps) + '</strong></span>' : '') +
          (ex.sets ? '<span>Sets: <strong>' + escHtml(ex.sets) + '</strong></span>' : '') +
        '</div>' +
        (ex.videoData ? '<video class="view-ex-video" src="' + ex.videoData + '" controls playsinline></video>' : '') +
      '</div>';
    exList.appendChild(row);
  });
  document.getElementById('viewModal').classList.add('visible');
  document.body.style.overflow = 'hidden';
}
/* close view modal */
document.getElementById('viewModalClose').addEventListener('click', function() {
  document.getElementById('viewModal').classList.remove('visible');
  document.body.style.overflow = '';
});
document.getElementById('viewModal').addEventListener('click', function(e) {
  if (e.target === this) { this.classList.remove('visible'); document.body.style.overflow = ''; }
});
/* load data first, then render everything */
loadFromStorage();
initCreateSession();
renderDashboard();
if (workouts.length > 0) renderWorkoutList();
if (sessions.length > 0) renderSessionsView();