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

// Utility function to delete all previous projects (use with caution!)
// This can be called from the browser console: deleteAllProjects()
async function deleteAllProjects() {
  if (!confirm('Are you sure you want to delete ALL projects? This cannot be undone!')) {
    return;
  }
  
  try {
    const snap = await db.collection('blogs').get();
    const batch = db.batch();
    let count = 0;
    
    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      alert(`Deleted ${count} project(s).`);
      loadBlogs();
    } else {
      alert('No projects to delete.');
    }
  } catch (err) {
    console.error('Error deleting projects:', err);
    alert('Failed to delete projects: ' + err.message);
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

    const holidays = {
      "15/08/2025": "Independence Day",
      "27/08/2025": "Ganesh Chaturthi",
      "02/10/2025": "Mahatma Gandhi Jayanti / Dussehra",
      "20/10/2025": "Diwali Holiday",
      "21/10/2025": "Diwali (Laxmi Poojan)",
      "22/10/2025": "Diwali (Balipratipada)",
      "23/10/2025": "Diwali (Bhaubij)",
      "24/10/2025": "Diwali Holiday",
      "25/10/2025": "Diwali Holiday",
      "05/11/2025": "Gurunanak Jayanti",
      "25/12/2025": "Christmas"
    };

    flatpickr(calendarContainer, {
      inline: true,
      dateFormat: "d/m/Y",
      onChange: function(selectedDates, dateStr, instance) {
        const selectedDate = selectedDates[0];
        const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
        selectedDateEl.textContent = dateStr;
        displayTimetableForDay(dayOfWeek);
      },
      onDayCreate: function(dObj, dStr, fp, dayElem) {
        const date = dayElem.dateObj;
        const dateString = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        if (holidays[dateString]) {
          dayElem.classList.add('holiday-date');
          dayElem.title = holidays[dateString];
        }
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

// Toggle post form visibility
function togglePostForm() {
  const formContainer = document.getElementById('postFormContainer');
  const isHidden = formContainer.classList.contains('hidden');
  
  if (isHidden) {
    formContainer.classList.remove('hidden');
    // Clear any edit state
    document.getElementById('submitPostBtn').textContent = 'Post Project';
    document.getElementById('submitPostBtn').onclick = createPost;
    clearPostForm();
  } else {
    formContainer.classList.add('hidden');
  }
}

// Cancel post form
function cancelPostForm() {
  document.getElementById('postFormContainer').classList.add('hidden');
  clearPostForm();
  const msg = document.getElementById('postMsg');
  if (msg) msg.textContent = '';
}

// Clear post form
function clearPostForm() {
  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';
  document.getElementById('postGit').value = '';
  document.getElementById('postLinked').value = '';
  // Remove any error classes
  document.getElementById('postGit').classList.remove('border-red-500');
  document.getElementById('postLinked').classList.remove('border-red-500');
}

// Validate URL
function validateURL(url, allowedDomain) {
  if (!url || url.trim() === '') return { valid: true, message: '' };
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's the allowed domain
    if (allowedDomain === 'github.com') {
      if (hostname === 'github.com' || hostname === 'www.github.com') {
        return { valid: true, message: '' };
      }
      return { valid: false, message: 'GitHub URL must be from github.com' };
    } else if (allowedDomain === 'linkedin.com') {
      if (hostname === 'linkedin.com' || hostname === 'www.linkedin.com') {
        return { valid: true, message: '' };
      }
      return { valid: false, message: 'LinkedIn URL must be from linkedin.com' };
    }
    
    return { valid: false, message: 'Invalid URL format' };
  } catch (e) {
    return { valid: false, message: 'Invalid URL format' };
  }
}

// Create or update blog post
let editingPostId = null;

async function createPost(){
  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const git = document.getElementById('postGit').value.trim();
  const linked = document.getElementById('postLinked').value.trim();
  const msg = document.getElementById('postMsg');
  
  msg.textContent = '';
  msg.className = 'text-sm font-semibold';
  
  // Validation
  if(!title || !content){ 
    msg.textContent = 'Title & content required';
    msg.className = 'text-sm text-red-400 font-semibold';
    return; 
  }
  
  // Validate URLs
  const gitValidation = validateURL(git, 'github.com');
  const linkedValidation = validateURL(linked, 'linkedin.com');
  
  const gitInput = document.getElementById('postGit');
  const linkedInput = document.getElementById('postLinked');
  
  if (!gitValidation.valid) {
    gitInput.classList.add('border-red-500');
    msg.textContent = gitValidation.message;
    msg.className = 'text-sm text-red-400 font-semibold';
    return;
  } else {
    gitInput.classList.remove('border-red-500');
  }
  
  if (!linkedValidation.valid) {
    linkedInput.classList.add('border-red-500');
    msg.textContent = linkedValidation.message;
    msg.className = 'text-sm text-red-400 font-semibold';
    return;
  } else {
    linkedInput.classList.remove('border-red-500');
  }
  
  try {
    const stud = await getStudent(currentUid);
    const user = auth.currentUser;
    const authorName = (stud && stud.name) ? stud.name : (user && user.email ? user.email.split('@')[0] : 'Anonymous');

    const postData = {
      authorId: currentUid,
      authorName: authorName,
      title, 
      content, 
      githubLink: git || '',
      linkedinLink: linked || '',
    };

    if (editingPostId) {
      // Update existing post
      await db.collection('blogs').doc(editingPostId).update({
        ...postData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      msg.textContent = 'Project updated ✓';
      editingPostId = null;
      document.getElementById('submitPostBtn').textContent = 'Post Project';
      document.getElementById('submitPostBtn').onclick = createPost;
    } else {
      // Create new post
      postData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('blogs').add(postData);
      msg.textContent = 'Project posted ✓';
    }
    
    msg.className = 'text-sm text-green-400 font-semibold';
    clearPostForm();
    document.getElementById('postFormContainer').classList.add('hidden');
    setTimeout(() => {
      msg.textContent = '';
    }, 2000);
    loadBlogs();
  } catch(err){
    console.error(err);
    msg.textContent = 'Error: ' + (err.message || 'Failed to post');
    msg.className = 'text-sm text-red-400 font-semibold';
  }
}

// Edit post
function editPost(postId) {
  // Fetch the post data
  db.collection('blogs').doc(postId).get().then(doc => {
    if (!doc.exists) {
      alert('Post not found');
      return;
    }
    
    const post = doc.data();
    
    // Check if user is the author
    if (post.authorId !== currentUid) {
      alert('You can only edit your own posts');
      return;
    }
    
    // Populate form
    document.getElementById('postTitle').value = post.title || '';
    document.getElementById('postContent').value = post.content || '';
    document.getElementById('postGit').value = post.githubLink || '';
    document.getElementById('postLinked').value = post.linkedinLink || '';
    
    // Set edit mode
    editingPostId = postId;
    document.getElementById('submitPostBtn').textContent = 'Update Project';
    document.getElementById('submitPostBtn').onclick = createPost;
    
    // Show form
    document.getElementById('postFormContainer').classList.remove('hidden');
    
    // Scroll to form
    document.getElementById('postFormContainer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }).catch(err => {
    console.error('Error loading post:', err);
    alert('Failed to load post for editing');
  });
}

// Delete post
async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this project?')) {
    return;
  }
  
  try {
    // Verify user is the author
    const postDoc = await db.collection('blogs').doc(postId).get();
    if (!postDoc.exists) {
      alert('Post not found');
      return;
    }
    
    const post = postDoc.data();
    if (post.authorId !== currentUid) {
      alert('You can only delete your own posts');
      return;
    }
    
    await db.collection('blogs').doc(postId).delete();
    loadBlogs();
  } catch(err) {
    console.error('Error deleting post:', err);
    alert('Failed to delete post');
  }
}

async function loadBlogs(){
  const feed = document.getElementById('blogFeed');
  if (!feed) return;
  
  feed.innerHTML = '<p class="text-slate-400 text-center">Loading projects...</p>';
  
  try {
    // 1. Fetch all students and create a map of their IDs to names for lookup.
    const studentsSnap = await db.collection('students').get();
    const studentMap = {};
    studentsSnap.forEach(doc => {
      studentMap[doc.id] = doc.data().name || doc.data().email.split('@')[0];
    });

    // 2. Fetch blog posts sorted by timestamp (newest first)
    const snap = await db.collection('blogs').orderBy('timestamp', 'desc').get();
    
    if(snap.empty){ 
      feed.innerHTML = '<p class="text-slate-400 text-center">No project posts yet. Be the first to share your project!</p>'; 
      return; 
    }
    
    const items = snap.docs.map(d => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data,
        // Handle both timestamp formats
        timestamp: data.timestamp || data.createdAt || null
      };
    });

    // Sort by date (most recent first) - fallback in case orderBy doesn't work
    items.sort((a, b) => {
      const dateA = a.timestamp ? (a.timestamp.seconds || a.timestamp) : 0;
      const dateB = b.timestamp ? (b.timestamp.seconds || b.timestamp) : 0;
      return dateB - dateA;
    });

    // 3. Render posts in list view
    feed.innerHTML = items.map(p => {
      const authorDisplayName = studentMap[p.authorId] || p.authorName || 'Unknown';
      const isAuthor = p.authorId === currentUid;
      
      // Format date
      let dateStr = 'Recently';
      if (p.timestamp) {
        const timestamp = p.timestamp.seconds ? p.timestamp.seconds * 1000 : p.timestamp;
        const date = new Date(timestamp);
        dateStr = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      return `
        <div class="bg-slate-900/50 p-4 rounded-lg border border-slate-700 transition-all hover:border-sky-500/50">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <h4 class="font-bold text-white text-lg mb-1">${p.title || 'Untitled Project'}</h4>
              <div class="flex items-center gap-3 text-sm">
                <p class="text-slate-400">by <span class="text-sky-400 font-semibold">${authorDisplayName}</span></p>
                <span class="text-slate-500">•</span>
                <p class="text-slate-500">${dateStr}</p>
              </div>
            </div>
            ${isAuthor ? `
              <div class="flex gap-2 ml-4">
                <button onclick="editPost('${p.id}')" class="text-xs bg-sky-600 hover:bg-sky-500 text-white font-semibold py-1 px-2 rounded transition-colors">Edit</button>
                <button onclick="deletePost('${p.id}')" class="text-xs bg-red-600 hover:bg-red-500 text-white font-semibold py-1 px-2 rounded transition-colors">Delete</button>
              </div>
            ` : ''}
          </div>
          <p class="text-slate-300 my-3 whitespace-pre-wrap">${p.content || ''}</p>
          <div class="flex gap-4 mt-4 pt-3 border-t border-slate-700">
            ${p.githubLink ? `<a href="${p.githubLink}" target="_blank" rel="noopener noreferrer" class="text-sm text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>` : ''}
            ${p.linkedinLink ? `<a href="${p.linkedinLink}" target="_blank" rel="noopener noreferrer" class="text-sm text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading blogs:', err);
    feed.innerHTML = '<p class="text-red-400 text-center">Error loading projects. Please refresh the page.</p>';
  }
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

