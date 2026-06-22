const STORAGE_KEY = "gpa-calculator-courses";
const courses = loadCourses();
let editingCourseId = null;
let auth = null;
let db = null;
let currentUser = null;
let remoteReady = false;
let signInWithPopup = null;
let signOut = null;
let googleProvider = null;
let getDoc = null;
let setDoc = null;
let doc = null;

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

const form = document.querySelector("#courseForm");
const nameInput = document.querySelector("#courseName");
const gradeInput = document.querySelector("#courseGrade");
const creditsInput = document.querySelector("#courseCredits");
const submitButton = document.querySelector("#submitButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const tableBody = document.querySelector("#courseTable");
const gpaValue = document.querySelector("#gpaValue");
const courseCount = document.querySelector("#courseCount");
const authTitle = document.querySelector("#authTitle");
const authStatus = document.querySelector("#authStatus");
const signInButton = document.querySelector("#signInButton");
const signOutButton = document.querySelector("#signOutButton");
const projectionDescription = document.querySelector("#projectionDescription");
const projectionList = document.querySelector("#projectionList");
const projectionGrades = [6, 7, 8, 9, 10];

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const grade = Number(gradeInput.value);
  const credits = Number(creditsInput.value);

  if (
    !name ||
    Number.isNaN(grade) ||
    grade < 6 ||
    grade > 10 ||
    Number.isNaN(credits) ||
    credits <= 0
  ) {
    return;
  }

  if (editingCourseId) {
    const course = courses.find((currentCourse) => currentCourse.id === editingCourseId);

    if (!course) {
      resetForm();
      return;
    }

    course.name = name;
    course.grade = grade;
    course.credits = credits;
  } else {
    courses.push({
      id: createCourseId(),
      name,
      grade,
      credits,
    });
  }

  saveCourses();
  resetForm();
  render();
});

tableBody.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-id]");
  const removeButton = event.target.closest("[data-remove-id]");

  if (editButton) {
    startEditing(editButton.dataset.editId);
    return;
  }

  if (!removeButton) {
    return;
  }

  const index = courses.findIndex((course) => course.id === removeButton.dataset.removeId);

  if (index >= 0) {
    courses.splice(index, 1);
    saveCourses();
    render();
  }
});

cancelEditButton.addEventListener("click", () => {
  resetForm();
});

signInButton.addEventListener("click", async () => {
  if (!auth || !signInWithPopup || !googleProvider) {
    updateAuthStatus("Firebase setup needed", "Paste your Firebase config in script.js first.");
    return;
  }

  try {
    updateAuthStatus("Opening Google sign-in", "Complete sign-in in the popup window.");
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    updateAuthStatus("Sign-in failed", getFirebaseErrorMessage(error));
  }
});

signOutButton.addEventListener("click", async () => {
  if (!auth || !signOut) {
    return;
  }

  await signOut(auth);
});

creditsInput.addEventListener("input", () => {
  renderProjections();
});

render();
initializeFirebase();

function render() {
  renderTable();
  renderGpa();
  renderProjections();
}

function renderTable() {
  if (courses.length === 0) {
    tableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="5">Add your first course to estimate your GPA.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = courses
    .map((course) => {
      const weightedPoints = course.grade * course.credits;

      return `
        <tr>
          <td data-label="Course">${escapeHtml(course.name)}</td>
          <td data-label="Grade"><span class="grade-pill">${formatGrade(course.grade)}</span></td>
          <td data-label="Credits">${formatNumber(course.credits)}</td>
          <td data-label="Points">${weightedPoints.toFixed(2)}</td>
          <td data-label="Actions">
            <div class="row-actions">
              <button class="edit-button" type="button" data-edit-id="${course.id}">
                Edit
              </button>
              <button class="remove-button" type="button" data-remove-id="${course.id}">
                Remove
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderGpa() {
  const { totalCredits, totalPoints } = getTotals();
  const gpa = totalCredits === 0 ? 0 : totalPoints / totalCredits;

  gpaValue.textContent = gpa.toFixed(2);
  courseCount.textContent =
    courses.length === 0
      ? "No courses yet"
      : `${courses.length} course${courses.length === 1 ? "" : "s"} • ${formatNumber(
          totalCredits,
        )} credits`;
}

function renderProjections() {
  const credits = Number(creditsInput.value);

  if (Number.isNaN(credits) || credits <= 0) {
    projectionDescription.textContent = "Enter course credits to preview GPA possibilities.";
    projectionList.innerHTML = "";
    return;
  }

  const currentCourse = courses.find((course) => course.id === editingCourseId);
  const totals = getTotals(currentCourse?.id);
  const scenarioLabel = currentCourse
    ? "Estimated GPA after saving this course with each grade."
    : "Estimated GPA if this course receives each grade.";

  projectionDescription.textContent = `${scenarioLabel} Using ${formatNumber(credits)} credits.`;
  projectionList.innerHTML = projectionGrades
    .map((grade) => {
      const projectedGpa = calculateGpaWithCourse(totals, grade, credits);

      return `
        <div class="projection-item">
          <span>Grade ${grade}</span>
          <strong>${projectedGpa.toFixed(2)}</strong>
        </div>
      `;
    })
    .join("");
}

function calculateGpaWithCourse(totals, grade, credits) {
  const projectedCredits = totals.totalCredits + credits;
  const projectedPoints = totals.totalPoints + grade * credits;

  return projectedCredits === 0 ? 0 : projectedPoints / projectedCredits;
}

function getTotals(excludedCourseId = null) {
  return courses.reduce(
    (totals, course) => {
      if (course.id === excludedCourseId) {
        return totals;
      }

      return {
        totalCredits: totals.totalCredits + course.credits,
        totalPoints: totals.totalPoints + course.grade * course.credits,
      };
    },
    { totalCredits: 0, totalPoints: 0 },
  );
}

function formatNumber(value) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatGrade(value) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

function createCourseId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function startEditing(courseId) {
  const course = courses.find((currentCourse) => currentCourse.id === courseId);

  if (!course) {
    return;
  }

  editingCourseId = course.id;
  nameInput.value = course.name;
  gradeInput.value = course.grade;
  creditsInput.value = course.credits;
  submitButton.textContent = "Save Changes";
  cancelEditButton.hidden = false;
  nameInput.focus();
  renderProjections();
}

function resetForm() {
  editingCourseId = null;
  form.reset();
  gradeInput.value = "8";
  creditsInput.value = "3";
  submitButton.textContent = "Add Course";
  cancelEditButton.hidden = true;
  nameInput.focus();
  renderProjections();
}

function saveCourses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));

  if (currentUser && remoteReady) {
    saveRemoteCourses();
  }
}

function loadCourses() {
  const savedCourses = localStorage.getItem(STORAGE_KEY);

  if (!savedCourses) {
    return [];
  }

  try {
    const parsedCourses = JSON.parse(savedCourses);

    if (!Array.isArray(parsedCourses)) {
      return [];
    }

    return normalizeCourses(parsedCourses);
  } catch {
    return [];
  }
}

async function initializeFirebase() {
  if (!isFirebaseConfigured()) {
    updateAuthStatus("Local mode", "Add Firebase config to sync courses across devices.");
    return;
  }

  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const firestoreModule = await import(
      "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
    );

    const app = appModule.initializeApp(firebaseConfig);
    auth = authModule.getAuth(app);
    db = firestoreModule.getFirestore(app);
    signInWithPopup = authModule.signInWithPopup;
    signOut = authModule.signOut;
    googleProvider = new authModule.GoogleAuthProvider();
    getDoc = firestoreModule.getDoc;
    setDoc = firestoreModule.setDoc;
    doc = firestoreModule.doc;

    authModule.onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      remoteReady = false;

      if (!user) {
        updateAuthStatus("Local mode", "Sign in to sync courses across devices.");
        signInButton.hidden = false;
        signOutButton.hidden = true;
        return;
      }

      updateAuthStatus("Syncing", `Signed in as ${user.email}. Loading cloud courses.`);
      signInButton.hidden = true;
      signOutButton.hidden = false;
      await loadRemoteCourses();
      remoteReady = true;
      updateAuthStatus("Cloud sync on", `Signed in as ${user.email}.`);
    });
  } catch (error) {
    updateAuthStatus("Firebase unavailable", getFirebaseErrorMessage(error));
  }
}

async function loadRemoteCourses() {
  const userCoursesRef = getUserCoursesRef();
  const snapshot = await getDoc(userCoursesRef);
  const remoteCourses = snapshot.exists() ? normalizeCourses(snapshot.data().courses) : [];

  if (remoteCourses.length > 0) {
    replaceCourses(remoteCourses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    resetForm();
    render();
    return;
  }

  if (courses.length > 0) {
    await saveRemoteCourses();
  }
}

async function saveRemoteCourses() {
  try {
    await setDoc(getUserCoursesRef(), {
      courses,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    updateAuthStatus("Sync failed", getFirebaseErrorMessage(error));
  }
}

function getUserCoursesRef() {
  return doc(db, "users", currentUser.uid, "gpa", "courses");
}

function replaceCourses(nextCourses) {
  courses.splice(0, courses.length, ...nextCourses);
}

function normalizeCourses(nextCourses) {
  if (!Array.isArray(nextCourses)) {
    return [];
  }

  return nextCourses
    .map((course) => ({
      id: typeof course.id === "string" ? course.id : createCourseId(),
      name: typeof course.name === "string" ? course.name.trim() : "",
      grade: Number(course.grade),
      credits: Number(course.credits),
    }))
    .filter(
      (course) =>
        course.name &&
        !Number.isNaN(course.grade) &&
        course.grade >= 6 &&
        course.grade <= 10 &&
        !Number.isNaN(course.credits) &&
        course.credits > 0,
    );
}

function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every((value) => value.trim().length > 0);
}

function updateAuthStatus(title, message) {
  authTitle.textContent = title;
  authStatus.textContent = message;
}

function getFirebaseErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user") {
    return "The sign-in popup was closed before finishing.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore security rules are blocking access.";
  }

  return error?.message || "Something went wrong. Check the browser console for details.";
}
