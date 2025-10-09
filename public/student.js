// student.js
let currentUid = null;
document.addEventListener('DOMContentLoaded', initStudent);

async function initStudent(){
  // if launched after login, sessionStorage contains uid OR user might be authenticated via Firebase
  currentUid = sessionStorage.getItem('campusgpt_uid');
  // if not in session, check firebase auth state
  if(!currentUid){
    auth.onAuthStateChanged(user => {
      if(user){
        currentUid = user.uid;
        sessionStorage.setItem('campusgpt_uid', currentUid);
        loadStudentDashboard();
      } else {
        window.location.href = 'index.html';
      }
    });
  } else {
    loadStudentDashboard();
  }
}

function formatSingleTime(timeStr) {
    let [hours, minutes] = timeStr.split(':').map(s => parseInt(s, 10));
    minutes = minutes || 0;
    let ampm = 'am';

    if (hours >= 1 && hours <= 7 || hours === 12) {
        ampm = 'pm';
    }

    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr}${ampm}`;
};

function formatTime(timeStr) {
    if (timeStr.includes('-')) {
        const [startTime, endTime] = timeStr.split('-').map(s => s.trim());
        return `${formatSingleTime(startTime)} - ${formatSingleTime(endTime)}`;
    }
    return formatSingleTime(timeStr);
};

async function loadStudentDashboard(){
  const student = await getStudent(currentUid);
  document.getElementById('studentNameDisp').textContent = student ? `Welcome, ${student.name || student.email}` : '';
  // attendance:
  const att = await computeAttendance(currentUid);
  document.getElementById('attendancePercent').textContent = `${att.percentage}%`;
  document.getElementById('attendanceRatio').textContent = `Attended ${att.attended} of ${att.total}`;

  // grades:
  const testsSnap = await db.collection('tests').get();
  const gradesList = document.getElementById('gradesList');
  let hasGrades = false;
  gradesList.innerHTML = '';
  testsSnap.forEach(doc => {
    const t = doc.data();
    const grade = (t.grades || []).find(g => g.studentId === currentUid);
    if(grade){
      hasGrades = true;
      gradesList.innerHTML += `
        <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-white">${t.title}</h4>
                    <p class="text-xs text-slate-400">${t.date}</p>
                    <p class="text-sm mt-2 text-slate-300">Suggestion: ${grade.suggestion || '—'}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-xl text-cyan-400">${grade.score} / ${t.totalMarks}</p>
                    ${t.resources ? `<a href="${t.resources}" target="_blank" class="text-xs text-sky-400 hover:underline">Resources</a>` : ''}
                </div>
            </div>
        </div>
      `;
    }
  });
  if(!hasGrades) gradesList.innerHTML = '<p class="text-slate-400 text-sm">No grades posted yet.</p>';

  loadBlogs();
  loadUpcomingTests();
  loadTimetable();
  loadFaculty();
  loadTodaysBirthdays();
  loadTodaysTimetable();
}

async function loadTimetable() {
  const calendarContainer = document.getElementById('calendar-container');
  const dailyTimetableContainer = document.getElementById('daily-timetable-container');
  const selectedDateEl = document.getElementById('selected-date');

  if (!calendarContainer || !dailyTimetableContainer) return;

  try {
    const response = await fetch('timetable.json');
    const timetableData = await response.json();
    const timetable = timetableData.Timetable;

    const displayTimetableForDay = (day) => {
      const dayData = timetable[day];
      if (dayData) {
        let html = '<ul class="space-y-2">';
        dayData.forEach(item => {
          html += `<li class="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                     <p class="font-bold text-white">${formatTime(item.time)}</p>
                     <p class="text-slate-300">${item.subject}</p>
                   </li>`;
        });
        html += '</ul>';
        dailyTimetableContainer.innerHTML = html;
      } else {
        dailyTimetableContainer.innerHTML = '<p class="text-slate-400">No timetable for this day.</p>';
      }
    };

    flatpickr(calendarContainer, {
      inline: true,
      dateFormat: "d/m/Y",
      onChange: function(selectedDates, dateStr, instance) {
        const selectedDate = selectedDates[0];
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
        selectedDateEl.textContent = dateStr;
        displayTimetableForDay(dayOfWeek);
      }
    });

    // Display timetable for today by default
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    selectedDateEl.textContent = today.toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });
    displayTimetableForDay(dayOfWeek);

  } catch (err) {
    console.error("Error loading timetable:", err);
    calendarContainer.innerHTML = '<p class="text-red-400">Could not load timetable data.</p>';
  }
}

async function loadFaculty() {
  const container = document.getElementById('faculty-container');
  if (!container) return;
  container.innerHTML = '<p class="text-slate-400 text-center">Loading faculty...</p>';
  try {
    const response = await fetch('faculty.json');
    const facultyData = await response.json();
    const courses = facultyData.Courses;
    let html = '';
    for (const courseCode in courses) {
      const course = courses[courseCode];
      html += `<div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-4">
                  <h4 class="font-bold text-white mb-2">${course.name}</h4>
                  <p class="text-slate-300"><strong>Faculty:</strong> ${course.faculty.join(', ')}</p>
               </div>`;
    }
    container.innerHTML = html;
  } catch (err) {
    console.error("Error loading faculty:", err);
    container.innerHTML = '<p class="text-red-400">Could not load faculty data.</p>';
  }
}

// create blog post
async function createPost(){
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const git = document.getElementById('postGit').value.trim();
  const linked = document.getElementById('postLinked').value.trim();
  const msg = document.getElementById('postMsg');
  msg.textContent = '';
  if(!title || !content){ msg.textContent = 'Title & content required'; return; }
  try {
    const stud = await getStudent(currentUid);
    const user = auth.currentUser;
    // Prioritize student name from DB, fallback to email prefix, finally to 'Anonymous'
    const authorName = (stud && stud.name) ? stud.name : (user && user.email ? user.email.split('@')[0] : 'Anonymous');

    await db.collection('blogs').add({
      authorId: currentUid,
      authorName: authorName, // Always store a readable name
      title, content, githubLink: git, linkedinLink: linked,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    msg.textContent = 'Posted ✓';
    document.getElementById('postTitle').value=''; document.getElementById('postContent').value=''; document.getElementById('postGit').value=''; document.getElementById('postLinked').value='';
    setTimeout(()=> msg.textContent='',1600);
    loadBlogs();
  } catch(err){
    console.error(err); msg.textContent = 'Error posting';
  }
}

async function loadBlogs(){
  const feed = document.getElementById('blogFeed');
  feed.innerHTML = '<p class="text-slate-400">Loading posts...</p>';
  
  // 1. Fetch all students and create a map of their IDs to names for lookup.
  const studentsSnap = await db.collection('students').get();
  const studentMap = {};
  studentsSnap.forEach(doc => {
    studentMap[doc.id] = doc.data().name || doc.data().email.split('@')[0];
  });

  // 2. Fetch blog posts
  const snap = await db.collection('blogs').orderBy('timestamp','desc').get();
  if(snap.empty){ feed.innerHTML = '<p class="text-slate-400">No project posts yet. Be the first!</p>'; return; }
  
  const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));

  // 3. Render posts, using the map to find the author's name if it's not on the post.
  feed.innerHTML = items.map(p => {
    // Check for the name on the post, then check the map, then fallback to the stored authorName (which might be the ID on old posts).
    const authorDisplayName = studentMap[p.authorId] || p.authorName;
    return `
    <div class="bg-slate-900/50 p-4 rounded-lg border border-slate-700 transition-all hover:border-sky-500/50">
      <div class="flex justify-between items-center">
        <h4 class="font-bold text-white">${p.title}</h4>
        <p class="text-xs text-slate-500">${p.timestamp ? new Date(p.timestamp.seconds*1000).toLocaleDateString() : 'just now'}</p>
      </div>
      <p class="text-sm text-slate-400 mt-1">by ${authorDisplayName}</p>
      <p class="text-slate-300 my-3">${p.content}</p>
      <div class="flex gap-4">
        ${p.githubLink ? `<a href="${p.githubLink}" target="_blank" class="text-sm text-sky-400 hover:underline">GitHub</a>` : ''}
        ${p.linkedinLink ? `<a href="${p.linkedinLink}" target="_blank" class="text-sm text-sky-400 hover:underline">LinkedIn</a>` : ''}
      </div>
    </div>
  `}).join('');
}

async function loadUpcomingTests() {
    const container = document.getElementById('upcomingTestsList');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Loading upcoming tests...</p>';

    try {
        const today = new Date().toISOString().slice(0, 10); // Get today's date as 'YYYY-MM-DD'
        
        // This query now filters for tests on or after today's date.
        const testsSnap = await db.collection('tests').where('date', '>=', today).orderBy('date', 'asc').get();
        
        const studentId = sessionStorage.getItem('campusgpt_uid');
        
        // Filter out tests the student has already been graded for
        const allUpcomingTests = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const upcomingTests = allUpcomingTests.filter(test => {
            const hasGrade = (test.grades || []).some(grade => grade.studentId === studentId);
            return !hasGrade;
        });

        if (upcomingTests.length === 0) {
            container.innerHTML = '<p class="text-green-400 font-semibold text-center mt-4">You are all caught up! No upcoming tests found.</p>';
            return;
        }

        container.innerHTML = upcomingTests.map(test => `
            <div class="bg-slate-900/50 p-4 rounded-lg border border-slate-700 transition-all hover:border-sky-500/50">
                <div class="flex flex-col sm:flex-row justify-between sm:items-start">
                    <div>
                        <h4 class="font-bold text-lg text-white">${test.title}</h4>
                        <p class="text-sm text-slate-400">${test.date} • ${test.totalMarks} Marks</p>
                    </div>
                    ${test.resources ? `<a href="${test.resources}" target="_blank" class="mt-2 sm:mt-0 text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold py-1 px-3 rounded-md transition-colors self-start">View Resources</a>` : ''}
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Error loading upcoming tests:", err);
        // This special error handling will guide you to create the required database index.
        if (err.message.includes('requires an index')) {
             container.innerHTML = `
                <div class="text-amber-400 text-sm text-center p-4 bg-amber-900/30 rounded-lg">
                    <p class="font-bold">Admin Action Required</p>
                    <p>A Firestore index is needed for this feature. Please open the link in the developer console (F12) to create it automatically.</p>
                </div>`;
            console.error("Firestore Index Required:", err.message);
        } else {
            container.innerHTML = '<p class="text-red-400">Could not load upcoming tests.</p>';
        }
    }
}


async function loadTodaysTimetable() {
  const container = document.getElementById('todays-timetable-container');
  if (!container) return;

  try {
    const response = await fetch('timetable.json');
    const timetableData = await response.json();
    const timetable = timetableData.Timetable;
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dayData = timetable[dayOfWeek];

    if (dayData) {
      let html = '<ul class="space-y-2">';
      dayData.forEach(item => {
        html += `<li class="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                   <p class="font-bold text-white">${formatTime(item.time)}</p>
                   <p class="text-slate-300">${item.subject}</p>
                 </li>`;
      });
      html += '</ul>';
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p class="text-slate-400">No classes today.</p>';
    }
  } catch (err) {
    console.error("Error loading timetable data:", err);
    container.innerHTML = '<p class="text-red-400">Could not load timetable data.</p>';
  }
}

async function loadTodaysBirthdays() {
  const container = document.getElementById('birthdays-container');
  if (!container) return;

  try {
    const response = await fetch('students.json');
    const studentData = await response.json();
    const today = new Date();

    const parseDate = (dateStr) => {
      const parts = dateStr.split(' ');
      const day = parseInt(parts[0], 10);
      const month = new Date(Date.parse(parts[1] +" 1, 2012")).getMonth();
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    };

    const birthdaysToday = studentData.filter(student => {
      const birthDate = parseDate(student['Birth Date']);
      return birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
    });

    if (birthdaysToday.length > 0) {
      const names = birthdaysToday.map(s => `<p class="text-slate-300">${s['Student Name']}</p>`).join('');
      container.innerHTML = names;
    } else {
      container.innerHTML = '<p class="text-slate-400">No birthdays today.</p>';
    }
  } catch (err) {
    console.error("Error loading birthday data:", err);
    container.innerHTML = '<p class="text-red-400">Could not load birthday data.</p>';
  }
}

function logoutStudent(){
  auth.signOut().finally(()=> {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });
}

