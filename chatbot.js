// chatbot.js - include on pages that should have chatbot UI
(function() {
  // create widget DOM if not present
  if (document.getElementById('campusgpt-chatbtn')) return;

  // --- 1. Inject styles for animations and a cleaner UI ---
  const style = document.createElement('style');
  style.textContent = `
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
      background: linear-gradient(90deg,#7c3aed,#8b5cf6); 
      color: white; 
      padding: 12px; 
      font-weight: 700;
    }
    #cgpt-close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
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
        background-color: #a78bfa;
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
  `;
  document.head.appendChild(style);


  // --- 2. Create Chat Button with SVG Icon ---
  const btn = document.createElement('button');
  btn.id = 'campusgpt-chatbtn';
  btn.className = 'btn';
  btn.style.position = 'fixed';
  btn.style.right = '22px';
  btn.style.bottom = '22px';
  btn.style.width = '56px';
  btn.style.height = '56px';
  btn.style.borderRadius = '999px';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5C12.8 6.5 13.5 5.8 13.5 5C13.5 4.2 12.8 3.5 12 3.5C11.2 3.5 10.5 4.2 10.5 5C10.5 5.8 11.2 6.5 12 6.5Z"/><path d="M18.5 10.5C18.5 11.3 19.2 12 20 12C20.8 12 21.5 11.3 21.5 10.5C21.5 9.7 20.8 9 20 9C19.2 9 18.5 9.7 18.5 10.5Z"/><path d="M3.5 10.5C3.5 11.3 4.2 12 5 12C5.8 12 6.5 11.3 6.5 10.5C6.5 9.7 5.8 9 5 9C4.2 9 3.5 9.7 3.5 10.5Z"/><path d="M12 18.5C14.5 18.5 16.5 16.5 16.5 14H7.5C7.5 16.5 9.5 18.5 12 18.5Z"/><path d="M14.5 14.5C14.8 14.5 15 14.3 15 14C15 12.1 13.4 10.5 11.5 10.5C9.6 10.5 8 12.1 8 14C8 14.3 8.2 14.5 8.5 14.5H14.5Z"/><path d="M7 21.5C7 21.8 7.2 22 7.5 22H16.5C16.8 22 17 21.8 17 21.5V21H7V21.5Z"/></svg>`;
  document.body.appendChild(btn);

  // --- 3. Create Chat Window with improved structure ---
  const win = document.createElement('div');
  win.id = 'campusgpt-chatwin';
  win.style.position = 'fixed';
  win.style.right = '22px';
  win.style.bottom = '86px';
  win.style.width = '340px';
  win.style.height = '420px';
  win.style.borderRadius = '12px';
  win.style.boxShadow = '0 12px 30px rgba(2,6,23,0.12)';
  win.style.overflow = 'hidden';
  win.className = 'card';
  win.innerHTML = `
    <div class="cgpt-header">
      <span>CampusGPT Assistant</span>
      <button id="cgpt-close-btn">&times;</button>
    </div>
    <div id="cgpt-messages" style="padding:12px; height:300px; overflow:auto; display:flex; flex-direction:column; gap: 8px; flex-grow: 1;"></div>
    <div style="display:flex; gap:8px; padding:10px; border-top:1px solid rgba(2,6,23,0.04)">
      <input id="cgpt-input" class="input" placeholder="Ask a question..." style="flex:1" />
      <button id="cgpt-send" class="btn">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  // --- 4. Event Listeners ---
  btn.addEventListener('click', () => {
    win.classList.toggle('visible');
    if (win.classList.contains('visible')) {
      const msgs = document.getElementById('cgpt-messages');
      if (msgs.children.length === 0) {
        msgs.innerHTML = `<div class="chat-bubble" style="background:#ffffff; color:#0f172a">Hello! Ask about your attendance or grades (e.g., "how many lectures for 75%?").</div>`;
      }
    }
  });

  document.getElementById('cgpt-close-btn').addEventListener('click', () => win.classList.remove('visible'));
  document.getElementById('cgpt-send').addEventListener('click', handle);
  document.getElementById('cgpt-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handle();
  });

  // --- 5. Core Functions ---
  async function addMessage(content, sender = 'bot', isHtml = false) {
    const container = document.getElementById('cgpt-messages');
    const el = document.createElement('div');
    el.className = 'chat-bubble';
    el.style.background = sender === 'bot' ? '#f3e8ff' : 'linear-gradient(90deg,#7c3aed,#8b5cf6)';
    el.style.color = sender === 'bot' ? '#6b21a8' : 'white';
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

})();

