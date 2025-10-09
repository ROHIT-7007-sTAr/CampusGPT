// teacher.js
document.addEventListener('DOMContentLoaded', initTeacher);

let allStudents = []; // Cache students to avoid re-fetching
let currentDivision = null; // To store the teacher's currently selected division

async function initTeacher(){
  currentDivision = sessionStorage.getItem('campusgpt_division');
  if(sessionStorage.getItem('campusgpt_role') !== 'teacher' || !currentDivision){
    window.location.href = 'index.html';
    return;
  }

  const tname = sessionStorage.getItem('campusgpt_teacherName') || 'Teacher';
  const teacherNameEl = document.getElementById('teacherName');
  if (teacherNameEl) {
    teacherNameEl.textContent = tname;
  }
  
  const datePicker = document.getElementById('attendanceDatePicker');
  if (datePicker) {
    datePicker.value = todayDateStr();
    datePicker.addEventListener('change', () => loadAttendanceForDate(datePicker.value));
  }

  await loadStudents();
  loadTests();
  loadTimetable();
  loadFaculty();
  
  const selectTestEl = document.getElementById('selectTest');
  if (selectTestEl) {
    selectTestEl.addEventListener('change', renderGradingList);
  }
}

async function loadTimetable() {
  const container = document.getElementById('timetable-container');
  if (!container) return;
  container.innerHTML = '<p class="text-slate-400 text-center">Loading timetable...</p>';
  try {
    const response = await fetch('timetable.json');
    const timetableData = await response.json();
    const timetable = timetableData.Timetable;
    let html = '<table class="w-full text-sm text-left text-slate-400">'
    html += '<thead class="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400"><tr><th scope="col" class="px-6 py-3">Day</th><th scope="col" class="px-6 py-3">Time</th><th scope="col" class="px-6 py-3">Subject</th></tr></thead><tbody>';
    for (const day in timetable) {
        timetable[day].forEach((item, index) => {
            html += `<tr class="bg-white border-b dark:bg-slate-800 dark:border-slate-700">`;
            if (index === 0) {
                html += `<td rowspan="${timetable[day].length}" class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">${day}</td>`;
            }
            html += `<td class="px-6 py-4">${item.time}</td>`;
            html += `<td class="px-6 py-4">${item.subject}</td>`;
            html += `</tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    console.error("Error loading timetable:", err);
    container.innerHTML = '<p class="text-red-400">Could not load timetable.</p>';
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

async function loadStudents(){
  const container = document.getElementById('studentList');
  if (!container) return; 
  container.innerHTML = '<p class="text-slate-400 text-center">Loading students...</p>';
  try {
    const res = await fetch('students.json');
    if (!res.ok) throw new Error('students.json not found');
    const allStudents = await res.json();
    
    container.innerHTML = allStudents.map(s => `
      <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
          <div>
              <p class="font-bold text-white">${s.name}</p>
              <p class="text-xs text-slate-400">${s.roll_no}</p>
          </div>
          <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" class="present-checkbox h-5 w-5 rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500" data-uid="${s.roll_no}" />
              <span class="text-slate-300">Present</span>
          </label>
      </div>
    `).join('');
    
    const selectedDate = document.getElementById('attendanceDatePicker').value;
    loadAttendanceForDate(selectedDate);
  } catch (err) {
    console.error("Error loading students:", err);
    container.innerHTML = `
      <div class="text-center p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
        <p class="font-bold text-red-400">Failed to Load Students</p>
        <p class="text-sm text-red-300 mt-1">${err.message}</p>
      </div>
    `;
  }
}

async function loadAttendanceForDate(dateStr) {
    if (!dateStr) return;
    
    document.querySelectorAll('.present-checkbox').forEach(box => box.checked = false);
    
    // Since we are not using firebase anymore, we can't load attendance from there.
    // I will leave this function empty for now.
}

async function saveAttendance(){
  const status = document.getElementById('attendanceStatus');
  const dateStr = document.getElementById('attendanceDatePicker').value;
  
  if (!dateStr) {
      if(status) status.textContent = 'Please select a date.';
      return;
  }

  if(status) status.textContent = 'Saving...';
  const boxes = Array.from(document.querySelectorAll('.present-checkbox'));
  const present = boxes.filter(b => b.checked).map(b => b.dataset.uid);
  
  console.log("Attendance for", dateStr, ":", present);

  if(status) {
      status.textContent = 'Saved to console ✓';
      setTimeout(() => status.textContent = '', 2500);
  }
}

async function uploadTest(){
  const title = document.getElementById('testTitle').value.trim();
  const date = document.getElementById('testDate').value;
  const total = parseInt(document.getElementById('testTotal').value);
  const resources = document.getElementById('testRes').value.trim();
  const msg = document.getElementById('testUploadMsg');
  const teacherName = sessionStorage.getItem('campusgpt_teacherName') || 'Unknown Teacher';

  if(!msg) return;

  msg.textContent = '';
  if(!title || !date || !total){ msg.textContent = 'All fields required.'; return; }
  try {
    await db.collection('tests').add({ 
        title, 
        date, 
        totalMarks: total, 
        resources, 
        grades: [],
        teacherName: teacherName,
        division: currentDivision // Add the division to the test document
    });
    msg.textContent = 'Test added ✓';
    document.getElementById('testTitle').value=''; document.getElementById('testDate').value=''; document.getElementById('testTotal').value=''; document.getElementById('testRes').value='';
    loadTests();
    setTimeout(() => msg.textContent='', 2000);
  } catch(err){
    console.error(err); msg.textContent='Error adding test';
  }
}

async function loadTests(){
  const sel = document.getElementById('selectTest');
  const all = document.getElementById('allTests');
  const teacherName = sessionStorage.getItem('campusgpt_teacherName');

  if (!sel || !all || !teacherName) return;

  sel.innerHTML = `<option value="">Select test to grade</option>`;
  all.innerHTML = 'Loading...';
  try {
    // Query now filters tests by both the logged-in teacher and their selected division
    const snap = await db.collection('tests')
        .where('teacherName', '==', teacherName)
        .where('division', '==', currentDivision)
        .orderBy('date','desc')
        .get();
    const tests = snap.docs.map(d => ({ id:d.id, ...d.data() }));

    if(tests.length === 0){ all.innerHTML = `<p class="text-slate-400">You have not created any tests for ${currentDivision} yet.</p>`; return; }
    
    sel.innerHTML += tests.map(t => `<option value="${t.id}">${t.title} • ${t.date}</option>`).join('');
    all.innerHTML = tests.map(t => `
        <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
            <div>
                <p class="font-bold text-white">${t.title}</p>
                <p class="text-xs text-slate-400">${t.date} • ${t.totalMarks} Marks</p>
            </div>
            ${t.resources ? `<a href="${t.resources}" target="_blank" class="text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold py-1 px-3 rounded-md transition-colors">Resources</a>` : ''}
        </div>
    `).join('');
  } catch (err) {
    console.error("Error loading tests:", err);
    if (err.code === 'failed-precondition') {
        all.innerHTML = `
        <div class="text-center p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
            <p class="font-bold text-red-400">Database Index Required</p>
            <p class="text-sm text-red-300 mt-1">
                A new database index is needed to filter tests by division. Please check the browser's developer console (F12) for a direct link to create this index.
            </p>
        </div>`;
    } else {
        all.innerHTML = '<p class="text-red-400">Could not load your tests.</p>';
    }
  }
}

async function renderGradingList(){
  const testId = document.getElementById('selectTest').value;
  const container = document.getElementById('gradingList');
  if(!container) return;

  container.innerHTML = '';
  if(!testId) return;

  try {
    const testSnap = await db.collection('tests').doc(testId).get();
    if(!testSnap.exists) { container.innerHTML = 'Test not found'; return; }
    const test = testSnap.data();
    
    const existing = test.grades || [];
    container.innerHTML = allStudents.map(s => {
        const eg = existing.find(g => g.studentId === s.id) || {};
        return `
        <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <p class="font-bold text-white mb-2">${s.name || s.email}</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
            <input class="sm:col-span-1 w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition grade-score" type="number" placeholder="Score" data-uid="${s.id}" value="${eg.score||''}" />
            <input class="sm:col-span-2 w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition grade-sugg" placeholder="Suggestion (optional)" data-uid="${s.id}" value="${eg.suggestion||''}" />
            <button class="sm:col-span-3 mt-1 text-xs bg-sky-700/50 hover:bg-sky-600/50 text-sky-200 py-1 px-2 rounded-md" onclick="generateAISuggestion(this, '${s.id}')">✨ AI Suggestion</button>
            </div>
        </div>
        `;
    }).join('');
  } catch (err) {
      console.error("Error rendering grading list:", err);
      container.innerHTML = '<p class="text-red-400">Could not load grading information.</p>';
  }
}

async function saveGrades(){
  const testId = document.getElementById('selectTest').value;
  const status = document.getElementById('gradesMsg');
  if(!status) return;

  status.textContent = 'Saving...';
  if(!testId){ status.textContent = 'Select a test'; return; }
  try {
    const scores = Array.from(document.querySelectorAll('.grade-score')).map(inp => {
      const uid = inp.dataset.uid;
      const score = inp.value ? Number(inp.value) : null;
      const sugg = document.querySelector(`.grade-sugg[data-uid="${uid}"]`).value || '';
      return { studentId: uid, score, suggestion: sugg };
    }).filter(x => x.score !== null);

    const gradesToSave = scores.map(s => ({ ...s, studentName: allStudents.find(stu => stu.id === s.studentId)?.name || '' }));

    await db.collection('tests').doc(testId).update({ grades: gradesToSave });
    status.textContent = 'Grades saved ✓';
    setTimeout(() => status.textContent = '', 2000);
  } catch(err){
    console.error(err); status.textContent = 'Error saving grades';
  }
}

function logout(){
  sessionStorage.clear();
  auth.signOut().finally(() => window.location.href = 'index.html');
}