// chatbot.js - include on pages that should have chatbot UI
(function() {
  // create widget DOM if not present
  if (document.getElementById('campusgpt-chatbtn')) return;

  // --- 1. Inject styles for animations and a cleaner UI ---
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    #campusgpt-chatwin {
      font-family: 'Inter', sans-serif;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    #campusgpt-chatbtn {
      transition: transform 0.2s ease-in-out;
    }
    #campusgpt-chatbtn:hover {
      transform: scale(1.1);
    }
    #campusgpt-chatwin {
      transform: translateY(20px);
      opacity: 0;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      visibility: hidden;
      display: flex;
      flex-direction: column;
    }
    #campusgpt-chatwin.visible {
      transform: translateY(0);
      opacity: 1;
      visibility: visible;
    }
    .cgpt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.1);
      color: white; 
      padding: 12px; 
      font-weight: 700;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    #cgpt-close-btn {
      background: none;
      border: none;
      color: #e5e7eb;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
    }
    #cgpt-close-btn:hover {
      color: white;
    }
    .typing-indicator {
        display: flex;
        align-items: center;
        padding: 8px 0;
    }
    .typing-indicator span {
        height: 8px;
        width: 8px;
        margin: 0 2px;
        background-color: #9ca3af;
        border-radius: 50%;
        display: inline-block;
        animation: bounce 1.4s infinite ease-in-out both;
    }
    .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1.0); }
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .chat-bubble {
        padding: 12px 16px;
        border-radius: 16px;
        margin: 8px 0;
        max-width: 85%;
        word-wrap: break-word;
        font-size: 18px;
        line-height: 1.5;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        animation: fadeIn 0.3s ease-out;
    }
    #cgpt-send:hover {
      background: #6d28d9 !important;
    }
    #cgpt-input {
      background-color: #f3f4f6; /* Solid, light gray background */
      color: #1f2937; /* Dark text for contrast */
      padding: 10px 16px; /* Add vertical and horizontal padding */
      border: 1px solid #e5e7eb; /* Subtle border */
      border-radius: 8px; /* Rounded corners */
    }
    #cgpt-input::placeholder {
      color: #9ca3af;
    }
    #cgpt-messages::-webkit-scrollbar {
      width: 8px;
    }
    #cgpt-messages::-webkit-scrollbar-track {
      background: #f3f4f6;
    }
    #cgpt-messages::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 4px;
    }
    #cgpt-messages::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
  `;
  document.head.appendChild(style);


  // --- 2. Create Chat Button with SVG Icon ---
  const btn = document.createElement('button');
  btn.id = 'campusgpt-chatbtn';
  btn.className = 'btn';
  btn.style.background = '#6d28d9';
  btn.style.position = 'fixed';
  btn.style.right = '22px';
  btn.style.bottom = '22px';
  btn.style.width = '56px';
  btn.style.height = '56px';
  btn.style.borderRadius = '999px';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  document.body.appendChild(btn);

  // --- 3. Create Chat Window with improved structure ---
  const win = document.createElement('div');
  win.id = 'campusgpt-chatwin';
  win.style.position = 'fixed';
  win.style.right = '22px';
  win.style.bottom = '86px';
  win.style.width = '400px';
  win.style.height = '500px';
  win.style.borderRadius = '12px';
  win.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.1)';
  win.style.overflow = 'hidden';
  win.className = 'card';
  win.innerHTML = `
    <div class="cgpt-header">
      <span>CampusGPT Assistant</span>
      <button id="cgpt-close-btn">&times;</button>
    </div>
    <div id="cgpt-messages" style="padding:16px; height:300px; overflow:auto; display:flex; flex-direction:column; gap: 8px; flex-grow: 1; scroll-behavior: smooth;"></div>
    <div style="display:flex; gap:8px; padding:10px; border-top:1px solid #e5e7eb">
      <input id="cgpt-input" class="input" placeholder="Ask a question..." style="background: transparent; border-color: rgba(255,255,255,0.3); color: white;" />
      <button id="cgpt-send" class="btn" style="background: rgba(255,255,255,0.2); color: white; border-radius: 8px; padding: 10px 16px; transition: background-color 0.3s ease;">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  // --- 4. Event Listeners ---
  btn.addEventListener('click', () => {
    win.classList.toggle('visible');
    if (win.classList.contains('visible')) {
      const msgs = document.getElementById('cgpt-messages');
      if (msgs.children.length === 0) {
        msgs.innerHTML = `<div class="chat-bubble" style="background:#ffffff; color:#0f172a"><strong>Welcome to CampusGPT!</strong><br>Your friendly academic assistant. Feel free to ask me anything about your attendance, grades, timetable, or faculty. <br><br><em>For example:</em><br>"How many lectures do I need for 75% attendance?"<br>"What is the timetable for Monday?"<br>"Who teaches Data Structures and Algorithms?"</div>`;
      }
    }
  });

  document.getElementById('cgpt-close-btn').addEventListener('click', () => win.classList.remove('visible'));
  document.getElementById('cgpt-send').addEventListener('click', handle);
  document.getElementById('cgpt-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handle();
  });

  // --- 5. Core Functions ---
  let timetableData = null;
  let facultyData = null;
  let studentData = null;

  async function loadData() {
    try {
      const [timetableRes, facultyRes, studentRes] = await Promise.all([
        fetch('timetable.json'),
        fetch('faculty.json'),
        fetch('itstudents.json')
      ]);
      timetableData = await timetableRes.json();
      facultyData = await facultyRes.json();
      studentData = await studentRes.json();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  async function addMessage(content, sender = 'bot', isHtml = false) {
    const container = document.getElementById('cgpt-messages');
    const el = document.createElement('div');
    el.className = 'chat-bubble';
    el.style.background = sender === 'bot' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.4)';
    el.style.color = sender === 'bot' ? '#f1f5f9' : '#f1f5f9';
    el.style.alignSelf = sender === 'bot' ? 'flex-start' : 'flex-end';
    
    if (isHtml) {
      el.innerHTML = content;
    } else {
      el.textContent = content;
    }

    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
  }

  async function handle() {
    const input = document.getElementById('cgpt-input');
    const q = input.value.trim();
    if (!q) return;
    await addMessage(q, 'user');
    input.value = '';
    const lowered = q.toLowerCase();
    const uid = sessionStorage.getItem('campusgpt_uid');

    // Only check for student-specific data if logged in as a student
    if (uid) {
      if (lowered.includes('attendance')) {
        const {
          total,
          attended,
          percentage
        } = await computeAttendance(uid);
        let resp = `You have attended ${attended} out of ${total} lectures (${percentage}%).`;
        if (total > 0 && percentage < 75) {
          let needed = 0;
          let futTotal = total;
          let futAtt = attended;
          while (((futAtt + needed) / (futTotal + needed)) * 100 < 75) {
            needed++;
          }
          resp += ` To reach 75% you need to attend the next ${needed} consecutive lecture(s).`;
        } else {
          resp += ` You're at or above 75%. Keep it up!`;
        }
        await addMessage(resp, 'bot');
        return;
      }

      if ((lowered.includes('grade') || lowered.includes('test') || lowered.includes('performance'))) {
        const testsSnap = await db.collection('tests').get();
        const responses = [];
        testsSnap.forEach(doc => {
          const t = doc.data();
          const g = (t.grades || []).find(x => x.studentId === uid);
          if (g) responses.push(`${t.title}: ${g.score}/${t.totalMarks}. Suggestion: ${g.suggestion||'—'}`);
        });
        if (responses.length) {
          await addMessage(responses.join('\n\n'), 'bot');
        } else {
          await addMessage("You don't have any grades yet.", 'bot');
        }
        return;
      }
    }

    if (timetableData && facultyData) {
      // Handle timetable and faculty questions
      const response = await handleTimetableAndFaculty(lowered);
      if (response) {
        await addMessage(response, 'bot');
        return;
      }
    }

    if (studentData) {
      const birthdayResponse = await handleBirthdayQueries(lowered);
      if (birthdayResponse) {
        await addMessage(birthdayResponse, 'bot');
        return;
      }
    }

    // ✨ New: Fallback to Gemini API with Typing Indicator
    await addMessage(`<div class="typing-indicator"><span></span><span></span><span></span></div>`, "bot", true);
    
    const prompt = `You are CampusGPT, a friendly and helpful academic assistant. A user asked: "${q}". Provide a concise and helpful answer. If it's outside academic topics, politely decline.`;
    const geminiResponse = await callGemini(prompt);

    // Update the "Thinking..." message with the actual response
    const messagesContainer = document.getElementById('cgpt-messages');
    const lastMessage = messagesContainer.lastChild;
    lastMessage.innerHTML = ''; // Clear the typing indicator
    lastMessage.textContent = geminiResponse;
  }

  async function handleTimetableAndFaculty(query) {
    // Enhanced keyword matching for better intent detection
    const isTimetableQuery = query.includes('timetable') || query.includes('schedule') || query.includes('what is on') || query.includes('when is');
    const isFacultyQuery = query.includes('faculty') || query.includes('teacher') || query.includes('professor') || query.includes('who teaches');

    if (isTimetableQuery) {
        // Attempt to extract a day from the query
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const day = days.find(d => query.includes(d));

        if (day) {
            const dayTitleCase = day.charAt(0).toUpperCase() + day.slice(1);
            const schedule = timetableData.Timetable[dayTitleCase];
            if (schedule && schedule.length > 0) {
                const scheduleText = schedule.map(item => `${item.time}: ${item.subject}`).join('\n');
                return `Here is the schedule for ${dayTitleCase}:\n${scheduleText}`;
            } else {
                return `There are no classes scheduled for ${dayTitleCase}.`;
            }
        } else {
            // Generic timetable response if no specific day is mentioned
            return "I can provide the timetable for any day of the week. For example, try 'What is the timetable for Monday?'";
        }
    }

    if (isFacultyQuery) {
        // Attempt to extract a course or faculty name from the query
        const courseName = Object.values(facultyData.Courses).find(c => query.includes(c.name.toLowerCase()));
        const facultyName = Object.values(facultyData.Courses).flatMap(c => c.faculty).find(f => query.includes(f.toLowerCase()));

        if (courseName) {
            const facultyList = courseName.faculty.join(', ');
            return `The faculty for ${courseName.name} are: ${facultyList}.`;
        }

        if (facultyName) {
            const coursesTaught = Object.entries(facultyData.Courses)
                .filter(([_, course]) => course.faculty.includes(facultyName))
                .map(([_, course]) => course.name);
            
            if (coursesTaught.length > 0) {
                return `${facultyName} teaches the following courses: ${coursesTaught.join(', ')}.`;
            } else {
                return `I couldn't find any courses taught by ${facultyName}.`;
            }
        }
        
        // Generic faculty response
        return "I can provide information about faculty and the courses they teach. For example, ask 'Who teaches Data Structures and Algorithms?' or 'What courses does Prof. Kanchan Bhale teach?'";
    }

    return null; // No relevant query found
  }

  async function handleBirthdayQueries(query) {
    if (!query.includes('birthday')) return null;

    const today = new Date();

    const parseDate = (dateStr) => {
      const parts = dateStr.split(' ');
      const day = parseInt(parts[0], 10);
      const month = new Date(Date.parse(parts[1] +" 1, 2012")).getMonth();
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    };

    const getBirthdaysToday = () => {
      return studentData.filter(student => {
        const birthDate = parseDate(student['Birth Date']);
        return birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
      });
    };

    const getBirthdaysThisWeek = () => {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return studentData.filter(student => {
        const birthDate = parseDate(student['Birth Date']);
        const studentBirthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        return studentBirthdayThisYear >= startOfWeek && studentBirthdayThisYear <= endOfWeek;
      });
    };

    const getBirthdaysThisMonth = () => {
      return studentData.filter(student => {
        const birthDate = parseDate(student['Birth Date']);
        return birthDate.getMonth() === today.getMonth();
      });
    };

    if (query.includes('today')) {
      const students = getBirthdaysToday();
      if (students.length > 0) {
        const names = students.map(s => s['Student Name']).join(', ');
        return `Today's birthdays: ${names}`;
      } else {
        return "No birthdays today.";
      }
    }

    if (query.includes('this week')) {
      const students = getBirthdaysThisWeek();
      if (students.length > 0) {
        const names = students.map(s => s['Student Name']).join(', ');
        return `Birthdays this week: ${names}`;
      } else {
        return "No birthdays this week.";
      }
    }

    if (query.includes('this month')) {
      const students = getBirthdaysThisMonth();
      if (students.length > 0) {
        const names = students.map(s => s['Student Name']).join(', ');
        return `Birthdays this month: ${names}`;
      } else {
        return "No birthdays this month.";
      }
    }

    return "I can answer questions about birthdays today, this week, or this month. For example: 'Who has a birthday today?'";
  }
  
  loadData();

})();

