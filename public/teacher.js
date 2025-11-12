// teacher.js
document.addEventListener("DOMContentLoaded", initTeacher);

let allStudents = []; // Cache students to avoid re-fetching
let currentDivision = null; // To store the teacher's currently selected division

async function initTeacher() {
  currentDivision = sessionStorage.getItem("campusgpt_division");
  if (
    sessionStorage.getItem("campusgpt_role") !== "teacher" ||
    !currentDivision
  ) {
    window.location.href = "index.html";
    return;
  }

  const tname = sessionStorage.getItem("campusgpt_teacherName") || "Teacher";
  const teacherNameEl = document.getElementById("teacherName");
  if (teacherNameEl) {
    teacherNameEl.textContent = tname;
  }

  const datePicker = document.getElementById("attendanceDatePicker");
  if (datePicker) {
    datePicker.value = todayDateStr();
    datePicker.addEventListener("change", () =>
      loadAttendanceForDate(datePicker.value)
    );
  }

  await loadStudents();
  loadTests();
  loadTimetable();
  loadFaculty();

  const selectTestEl = document.getElementById("selectTest");
  if (selectTestEl) {
    selectTestEl.addEventListener("change", renderGradingList);
  }
}

async function loadTimetable() {
  const container = document.getElementById("timetable-container");
  if (!container) return;
  container.innerHTML =
    '<p class="text-slate-400 text-center">Loading timetable...</p>';
  try {
    const response = await fetch("timetable.json");
    const timetableData = await response.json();
    const timetable = timetableData.Timetable;
    let html = '<table class="w-full text-sm text-left text-slate-400">';
    html +=
      '<thead class="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400"><tr><th scope="col" class="px-6 py-3">Day</th><th scope="col" class="px-6 py-3">Time</th><th scope="col" class="px-6 py-3">Subject</th></tr></thead><tbody>';
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
    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (err) {
    console.error("Error loading timetable:", err);
    container.innerHTML =
      '<p class="text-red-400">Could not load timetable.</p>';
  }
}

async function loadFaculty() {
  const container = document.getElementById("faculty-container");
  if (!container) return;
  container.innerHTML =
    '<p class="text-slate-400 text-center">Loading faculty...</p>';
  try {
    const response = await fetch("faculty.json");
    const facultyData = await response.json();
    const courses = facultyData.Courses;
    let html = "";
    for (const courseCode in courses) {
      const course = courses[courseCode];
      html += `<div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-4">
                  <h4 class="font-bold text-white mb-2">${course.name}</h4>
                  <p class="text-slate-300"><strong>Faculty:</strong> ${course.faculty.join(
                    ", "
                  )}</p>
               </div>`;
    }
    container.innerHTML = html;
  } catch (err) {
    console.error("Error loading faculty:", err);
    container.innerHTML =
      '<p class="text-red-400">Could not load faculty data.</p>';
  }
}

async function loadStudents() {
  const container = document.getElementById("studentList");
  if (!container) return;
  container.innerHTML =
    '<p class="text-slate-400 text-center">Loading students...</p>';

  if (!currentDivision) {
    container.innerHTML =
      '<p class="text-red-400">Could not determine your division. Please log in again.</p>';
    return;
  }

  try {
    // Determine which student file to load based on the teacher's division
    const studentFile = `${currentDivision.toLowerCase()}students.json`;
    const res = await fetch(studentFile);
    if (!res.ok)
      throw new Error(
        `Could not find student data for division: ${currentDivision}`
      );

    allStudents = await res.json(); // Cache the students

    if (!allStudents || allStudents.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-center">No students found for division ${currentDivision}.</p>`;
      return;
    }

    container.innerHTML = allStudents
      .map(
        (s) => `
            <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                <div>
                    <p class="font-bold text-white">${
                      s["Student Name"] || "N/A"
                    }</p>
                    <p class="text-xs text-slate-400">${
                      s["Roll No"] || "N/A"
                    }</p>
                </div>
                <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" class="present-checkbox h-5 w-5 rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500" data-uid="${
                      s["Roll No"]
                    }" />
                    <span class="text-slate-300">Present</span>
                </label>
            </div>
        `
      )
      .join("");

    const selectedDate = document.getElementById("attendanceDatePicker").value;
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

  document
    .querySelectorAll(".present-checkbox")
    .forEach((box) => (box.checked = false));

  // Since we are not using firebase anymore, we can't load attendance from there.
  // I will leave this function empty for now.
}

async function saveAttendance() {
  const status = document.getElementById("attendanceStatus");
  const dateStr = document.getElementById("attendanceDatePicker").value;

  if (!dateStr) {
    if (status) status.textContent = "Please select a date.";
    return;
  }

  if (status) status.textContent = "Saving...";
  const boxes = Array.from(document.querySelectorAll(".present-checkbox"));
  const present = boxes.filter((b) => b.checked).map((b) => b.dataset.uid);

  console.log("Attendance for", dateStr, ":", present);

  if (status) {
    status.textContent = "Saved to console ✓";
    setTimeout(() => (status.textContent = ""), 2500);
  }
}

async function uploadTest() {
  const title = document.getElementById("testTitle").value.trim();
  const date = document.getElementById("testDate").value;
  const total = parseInt(document.getElementById("testTotal").value);
  const resources = document.getElementById("testRes").value.trim();
  const msg = document.getElementById("testUploadMsg");
  const teacherName =
    sessionStorage.getItem("campusgpt_teacherName") || "Unknown Teacher";

  if (!msg) return;

  msg.textContent = "";
  msg.className = "text-sm text-green-400 font-semibold";
  
  // Validation
  if (!title || !date || !total || isNaN(total) || total <= 0) {
    msg.textContent = "All fields required. Total marks must be a positive number.";
    msg.className = "text-sm text-red-400 font-semibold";
    return;
  }

  if (!currentDivision) {
    msg.textContent = "Error: Division not set. Please log in again.";
    msg.className = "text-sm text-red-400 font-semibold";
    return;
  }

  try {
    msg.textContent = "Uploading...";
    msg.className = "text-sm text-yellow-400 font-semibold";
    
    await db.collection("tests").add({
      title,
      date,
      totalMarks: total,
      resources: resources || "",
      grades: [],
      teacherName: teacherName,
      division: currentDivision,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    msg.textContent = "Test uploaded successfully ✓";
    msg.className = "text-sm text-green-400 font-semibold";
    
    // Clear form
    document.getElementById("testTitle").value = "";
    document.getElementById("testDate").value = "";
    document.getElementById("testTotal").value = "";
    document.getElementById("testRes").value = "";
    
    // Reload tests to update "All Created Tests" tile
    await loadTests();
    
    setTimeout(() => {
      msg.textContent = "";
    }, 3000);
  } catch (err) {
    console.error("Error uploading test:", err);
    msg.textContent = `Error: ${err.message || "Failed to upload test"}`;
    msg.className = "text-sm text-red-400 font-semibold";
  }
}

async function loadTests() {
  const sel = document.getElementById("selectTest");
  const all = document.getElementById("allTests");
  const teacherName = sessionStorage.getItem("campusgpt_teacherName");

  if (!sel || !all || !teacherName) return;

  sel.innerHTML = `<option value="">Select test to grade</option>`;
  all.innerHTML = '<p class="text-slate-400 text-center">Loading tests...</p>';
  
  try {
    let tests = [];
    
    // Try to query with both filters first
    try {
      const snap = await db
        .collection("tests")
        .where("teacherName", "==", teacherName)
        .where("division", "==", currentDivision)
        .orderBy("date", "desc")
        .get();
      tests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      // If index error, fallback to filtering in JavaScript
      if (err.code === "failed-precondition" || err.code === "unavailable") {
        console.warn("Index not available, using fallback query");
        const snap = await db
          .collection("tests")
          .where("teacherName", "==", teacherName)
          .get();
        tests = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => t.division === currentDivision)
          .sort((a, b) => {
            // Sort by date descending
            if (a.date < b.date) return 1;
            if (a.date > b.date) return -1;
            return 0;
          });
      } else {
        throw err;
      }
    }

    if (tests.length === 0) {
      all.innerHTML = `<p class="text-slate-400 text-center">You have not created any tests for ${currentDivision} yet.</p>`;
      return;
    }

    // Update dropdown for grading
    sel.innerHTML += tests
      .map((t) => `<option value="${t.id}">${t.title} • ${t.date}</option>`)
      .join("");
    
    // Update "All Created Tests" tile
    all.innerHTML = tests
      .map(
        (t) => `
        <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center mb-3">
            <div>
                <p class="font-bold text-white">${t.title}</p>
                <p class="text-xs text-slate-400">${t.date} • ${
          t.totalMarks
        } Marks</p>
                ${t.grades && t.grades.length > 0 
                  ? `<p class="text-xs text-green-400 mt-1">${t.grades.length} student(s) graded</p>` 
                  : `<p class="text-xs text-yellow-400 mt-1">No grades yet</p>`}
            </div>
            ${
              t.resources
                ? `<a href="${t.resources}" target="_blank" class="text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold py-1 px-3 rounded-md transition-colors">Resources</a>`
                : ""
            }
        </div>
    `
      )
      .join("");
  } catch (err) {
    console.error("Error loading tests:", err);
    all.innerHTML = `
      <div class="text-center p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
        <p class="font-bold text-red-400">Error Loading Tests</p>
        <p class="text-sm text-red-300 mt-1">${err.message || "Could not load your tests."}</p>
      </div>`;
  }
}

async function renderGradingList() {
  const testId = document.getElementById("selectTest").value;
  const container = document.getElementById("gradingList");

  if (!container) return;

  container.innerHTML = "";

  if (!testId) {
    container.innerHTML = '<p class="text-slate-400 text-center">Please select a test to grade.</p>';
    return;
  }

  if (!allStudents || allStudents.length === 0) {
    container.innerHTML = '<p class="text-red-400">No students loaded. Please refresh the page.</p>';
    return;
  }

  try {
    container.innerHTML = '<p class="text-slate-400 text-center">Loading test information...</p>';
    
    const testSnap = await db.collection("tests").doc(testId).get();

    if (!testSnap.exists) {
      container.innerHTML = '<p class="text-red-400">Test not found.</p>';
      return;
    }

    const test = testSnap.data();
    const existing = test.grades || [];
    const maxMarks = test.totalMarks || 100;

    container.innerHTML = `
      <div class="mb-4 p-3 bg-slate-900/70 rounded-lg border border-slate-600">
        <p class="text-white font-semibold">${test.title}</p>
        <p class="text-sm text-slate-400">Date: ${test.date} • Total Marks: ${maxMarks}</p>
      </div>
      <div class="space-y-3">
        ${allStudents
          .map((s) => {
            const eg = existing.find((g) => g.studentId === s["Roll No"]) || {};
            const currentScore = eg.score !== undefined && eg.score !== null ? eg.score : "";
            const currentSuggestion = eg.suggestion || "";

            return `
            <div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <p class="font-bold text-white mb-2">${s["Student Name"] || "N/A"} <span class="text-xs text-slate-400 font-normal">(Roll No: ${s["Roll No"] || "N/A"})</span></p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <input 
                        class="sm:col-span-1 w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition grade-score" 
                        type="number" 
                        placeholder="Score (max: ${maxMarks})" 
                        min="0" 
                        max="${maxMarks}"
                        data-uid="${s["Roll No"]}" 
                        value="${currentScore}" 
                    />
                    <input 
                        class="sm:col-span-2 w-full bg-slate-900/70 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition grade-sugg" 
                        placeholder="Suggestion (optional)" 
                        data-uid="${s["Roll No"]}" 
                        value="${currentSuggestion}" 
                    />
                    ${typeof generateAISuggestion === 'function' 
                      ? `<button class="sm:col-span-3 mt-1 text-xs bg-sky-700/50 hover:bg-sky-600/50 text-sky-200 py-1 px-2 rounded-md" onclick="generateAISuggestion(this, '${s["Roll No"]}')">✨ AI Suggestion</button>`
                      : ''}
                </div>
            </div>
            `;
          })
          .join("")}
      </div>
    `;
  } catch (err) {
    console.error("Error rendering grading list:", err);
    container.innerHTML = `<p class="text-red-400">Could not load grading information: ${err.message || "Unknown error"}</p>`;
  }
}

async function saveGrades() {
  const testId = document.getElementById("selectTest").value;
  const status = document.getElementById("gradesMsg");
  if (!status) return;

  status.textContent = "Saving...";
  status.className = "text-sm text-yellow-400 font-semibold";
  
  if (!testId) {
    status.textContent = "Please select a test first";
    status.className = "text-sm text-red-400 font-semibold";
    return;
  }

  try {
    // Get test to validate max marks
    const testSnap = await db.collection("tests").doc(testId).get();
    if (!testSnap.exists) {
      status.textContent = "Test not found";
      status.className = "text-sm text-red-400 font-semibold";
      return;
    }

    const test = testSnap.data();
    const maxMarks = test.totalMarks || 100;

    const scores = Array.from(document.querySelectorAll(".grade-score"))
      .map((inp) => {
        const uid = inp.dataset.uid;
        const scoreValue = inp.value.trim();
        const score = scoreValue ? Number(scoreValue) : null;
        
        // Validate score is within range
        if (score !== null && (score < 0 || score > maxMarks)) {
          return { studentId: uid, score: null, error: `Score must be between 0 and ${maxMarks}` };
        }
        
        const suggInput = document.querySelector(`.grade-sugg[data-uid="${uid}"]`);
        const sugg = suggInput ? suggInput.value.trim() : "";
        
        return { studentId: uid, score, suggestion: sugg };
      })
      .filter((x) => {
        if (x.error) {
          console.warn(`Validation error for student ${x.studentId}: ${x.error}`);
          return false;
        }
        return x.score !== null;
      });

    if (scores.length === 0) {
      status.textContent = "No grades to save. Please enter at least one score.";
      status.className = "text-sm text-yellow-400 font-semibold";
      return;
    }

    const gradesToSave = scores.map((s) => ({
      studentId: s.studentId,
      score: s.score,
      suggestion: s.suggestion || "",
      studentName:
        allStudents.find((stu) => stu["Roll No"] === s.studentId)?.[
          "Student Name"
        ] || "",
    }));

    await db.collection("tests").doc(testId).update({ 
      grades: gradesToSave,
      lastGradedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    status.textContent = `Grades saved successfully ✓ (${gradesToSave.length} student(s))`;
    status.className = "text-sm text-green-400 font-semibold";
    
    // Reload tests to update the "All Created Tests" tile
    await loadTests();
    
    setTimeout(() => {
      status.textContent = "";
    }, 3000);
  } catch (err) {
    console.error("Error saving grades:", err);
    status.textContent = `Error: ${err.message || "Failed to save grades"}`;
    status.className = "text-sm text-red-400 font-semibold";
  }
}

function logout() {
  sessionStorage.clear();
  auth.signOut().finally(() => (window.location.href = "index.html"));
}
