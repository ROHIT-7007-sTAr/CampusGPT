// common.js
// Shared Firebase init + helpers used by index/teacher/student

// VITAL STEP: Replace this entire object with the one from your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyCgm6YGUK_W23omEdlB2v-1LBJmgU9VYBw",
  authDomain: "cep2025-f30b4.firebaseapp.com",
  projectId: "cep2025-f30b4",
  storageBucket: "cep2025-f30b4.firebasestorage.app",
  messagingSenderId: "249495059083",
  appId: "1:249495059083:web:4f727bb469879e6c44f28e",
};


// --- No changes needed below this line ---

// Use the compat libraries via CDN
if (!window.firebase || !firebase.apps) {
  console.error("Make sure firebase compat libs are included in your HTML before common.js");
}

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

/* Firestore layout (collections):
 - students (docId = uid) { name, roll, email }
 - attendance (docId = yyyy-mm-dd) { presentStudents: [uid,...] }
 - tests (auto-id) { title, date, totalMarks, resources, grades: [ {studentId,score,suggestion,studentName} ] }
 - blogs (auto-id) { authorId, authorName, title, content, githubLink, linkedinLink, timestamp }
*/

// Utility to get today's date string (ISO yyyy-mm-dd)
function todayDateStr() {
  return new Date().toISOString().slice(0,10);
}

// Get student doc by uid
async function getStudent(uid){
  const docRef = db.collection('students').doc(uid);
  const snap = await docRef.get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

// compute attendance percentage for a student
async function computeAttendance(uid) {
  const snap = await db.collection('attendance').get();
  const total = snap.size;
  let attended = 0;
  snap.forEach(doc => {
    const data = doc.data();
    if (Array.isArray(data.presentStudents) && data.presentStudents.includes(uid)) attended++;
  });
  const percentage = total > 0 ? (attended/total)*100 : 0;
  return { total, attended, percentage: Number(percentage.toFixed(1)) };
}
