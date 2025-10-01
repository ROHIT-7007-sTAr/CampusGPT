// Firebase setup
const firebaseConfig = { /* your keys */ };
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Section switching
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// Login
async function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  // Check teacher.json
  const res = await fetch("teacher.json");
  const data = await res.json();
  const teacher = data.teachers.find(t => t.email === email && t.password === password);

  if (teacher) {
    alert("Welcome " + teacher.name);
    showSection("teacher-dashboard");
    return;
  }

  // Else check Firebase student
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showSection("student-dashboard");
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

// Signup for student
async function signup() {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    alert("Signup successful!");
    showSection("login");
  } catch (err) {
    alert(err.message);
  }
}

// Chatbot
function toggleChatbot() {
  document.getElementById("chatbot-window").classList.toggle("hidden");
}

function addChatMessage(msg, sender = "bot") {
  const div = document.createElement("div");
  div.textContent = msg;
  div.className = sender === "bot" ? "bg-purple-200 p-2 my-1 rounded" : "bg-purple-600 text-white p-2 my-1 rounded self-end";
  document.getElementById("chat-messages").appendChild(div);
}

function handleChat() {
  const input = document.getElementById("chat-input");
  const msg = input.value.trim();
  if (!msg) return;
  addChatMessage(msg, "user");
  input.value = "";

  // TODO: Replace with AI backend
  if (msg.includes("attendance")) {
    addChatMessage("You need 12 more lectures to reach 75% attendance.");
  } else if (msg.includes("test")) {
    addChatMessage("Your last test score was 68/100. Suggested focus: Algebra.");
  } else {
    addChatMessage("🤖 I'm still learning! Ask me about attendance or tests.");
  }
}
