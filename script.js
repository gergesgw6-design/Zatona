// --- 1. FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCTsWFrZEKI7S0n9_9BjFHvxzTmnTwe1qs",
  authDomain: "zatona-cf9e5.firebaseapp.com",
  databaseURL: "https://zatona-cf9e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "zatona-cf9e5",
  storageBucket: "zatona-cf9e5.firebasestorage.app",
  messagingSenderId: "582890118413",
  appId: "1:582890118413:web:98e97c964337225763a444"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const Groq_API_KEY = "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";

let currentUser = null;
let userProfileData = null;
let pdfExtractedText = ""; // سيتخزن هنا محتوى منهج الترم كاملاً

// --- 2. AUTHENTICATION & USER PROFILE SETUP ---
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    db.ref('users/' + user.uid).once('value').then(snapshot => {
      userProfileData = snapshot.val() || { name: user.displayName || 'طالب زتونة', grade: '', stream: '', specialSubject: '', credits: 3 };
      
      if (!userProfileData.grade) {
        document.getElementById('gradeModal').classList.remove('hidden');
      } else {
        showWorkspace();
      }
    });
  } else {
    currentUser = null;
    showAuthScreen();
  }
});

function switchAuthTab(type) {
  if (type === 'login') {
    document.getElementById('tabLogin').classList.add('active');
    document.getElementById('tabRegister').classList.remove('active');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  } else {
    document.getElementById('tabRegister').classList.add('active');
    document.getElementById('tabLogin').classList.remove('active');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
  }
}

function handleGoogleAuth() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => alert("خطأ في تسجيل الدخول: " + err.message));
}

function handleEmailLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;
  auth.signInWithEmailAndPassword(email, pass).catch(err => alert("خطأ: " + err.message));
}

function handleEmailRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPassword').value;

  auth.createUserWithEmailAndPassword(email, pass).then(res => {
    db.ref('users/' + res.user.uid).set({
      name: name,
      email: email,
      grade: '',
      stream: '',
      specialSubject: '',
      credits: 3
    });
  }).catch(err => alert("خطأ في إنشاء الحساب: " + err.message));
}

// --- 3. MODAL LOGIC FOR PERMANENT SELECTION ---
function onGradeModalChange() {
  const grade = document.getElementById('modalGradeSelect').value;
  const streamBox = document.getElementById('modalStreamBox');
  const specBox = document.getElementById('modalSpecSubjectBox');
  const streamSelect = document.getElementById('modalStreamSelect');

  streamBox.classList.add('hidden');
  specBox.classList.add('hidden');

  if (grade === 'ثانية باكالوريا') {
    streamSelect.innerHTML = `
      <option value="">-- اختر المسار --</option>
      <option value="طب وعلوم الحياة">مسار طب وعلوم الحياة</option>
      <option value="هندسة وعلوم الحاسب">مسار هندسة وعلوم الحاسب</option>
      <option value="إدارة الأعمال">مسار إدارة الأعمال</option>
      <option value="الفنون والآداب">مسار الفنون والآداب</option>
    `;
    streamBox.classList.remove('hidden');
  } else if (grade === 'ثالثة ثانوي') {
    streamSelect.innerHTML = `
      <option value="">-- اختر الشعبة --</option>
      <option value="علمي علوم">علمي علوم</option>
      <option value="علمي رياضة">علمي رياضة</option>
      <option value="أدبي">أدبي</option>
    `;
    streamBox.classList.remove('hidden');
  }
}

function onModalStreamChange() {
  const grade = document.getElementById('modalGradeSelect').value;
  const stream = document.getElementById('modalStreamSelect').value;
  const specBox = document.getElementById('modalSpecSubjectBox');
  const specSelect = document.getElementById('modalSpecSubjectSelect');

  if (grade === 'ثانية باكالوريا') {
    specBox.classList.remove('hidden');
    specSelect.innerHTML = '<option value="">-- اختر المادة التخصصية الثابتة --</option>';

    if (stream === 'طب وعلوم الحياة') {
      specSelect.innerHTML += '<option value="فيزياء">فيزياء</option><option value="رياضيات">رياضيات</option>';
    } else if (stream === 'هندسة وعلوم الحاسب') {
      specSelect.innerHTML += '<option value="برمجة">برمجة</option><option value="كيمياء">كيمياء</option>';
    } else if (stream === 'إدارة الأعمال') {
      specSelect.innerHTML += '<option value="إدارة أعمال">إدارة أعمال</option><option value="محاسبة">محاسبة</option>';
    } else if (stream === 'الفنون والآداب') {
      specSelect.innerHTML += '<option value="لغة أجنبية ثانية">لغة أجنبية ثانية</option><option value="علم نفس">علم نفس</option>';
    }
  } else {
    specBox.classList.add('hidden');
  }
}

function saveUserSetupPermanent() {
  const grade = document.getElementById('modalGradeSelect').value;
  const stream = document.getElementById('modalStreamSelect').value;
  const specSubj = document.getElementById('modalSpecSubjectSelect').value;

  if (!grade) { alert('يرجى اختيار الصف الدراسي'); return; }
  if (grade !== 'أولى باكالوريا' && !stream) { alert('يرجى اختيار الشعبة / المسار'); return; }
  if (grade === 'ثانية باكالوريا' && !specSubj) { alert('يرجى اختيار المادة التخصصية الثابتة'); return; }

  const updateData = {
    grade: grade,
    stream: stream || 'عام',
    specialSubject: specSubj || ''
  };

  db.ref('users/' + currentUser.uid).update(updateData).then(() => {
    Object.assign(userProfileData, updateData);
    document.getElementById('gradeModal').classList.add('hidden');
    showWorkspace();
  });
}

// --- 4. RENDER WORKSPACE & SUBJECTS ---
function showWorkspace() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('appWorkspace').classList.remove('hidden');
  
  let infoText = `${userProfileData.grade}`;
  if (userProfileData.stream && userProfileData.stream !== 'عام') infoText += ` - ${userProfileData.stream}`;

  document.getElementById('userHeaderActions').innerHTML = `
    <div class="user-profile-tag">
      <i class="fas fa-user-circle"></i>
      <span>${userProfileData.name}</span>
      <span class="grade-badge">${infoText}</span>
      <button onclick="auth.signOut()" style="border:none; background:none; cursor:pointer; color:var(--gold-accent);"><i class="fas fa-sign-out-alt"></i></button>
    </div>
  `;

  document.getElementById('creditsLeft').innerText = userProfileData.credits || 0;
  loadSubjectsForUser();
}

function showAuthScreen() {
  document.getElementById('authSection').classList.remove('hidden');
  document.getElementById('appWorkspace').classList.add('hidden');
  document.getElementById('userHeaderActions').innerHTML = '';
}

function loadSubjectsForUser() {
  const subjectSelect = document.getElementById('subjectSelect');
  subjectSelect.innerHTML = '<option value="">-- اختر المادة --</option>';
  let subjects = [];

  if (userProfileData.grade === 'أولى باكالوريا') {
    subjects = ['فلسفة', 'علوم متكاملة', 'تاريخ', 'عربي', 'إنجليزي'];
  } else if (userProfileData.grade === 'ثانية باكالوريا') {
    subjects = ['عربي', 'إنجليزي', 'تاريخ'];
    if (userProfileData.specialSubject) subjects.push(userProfileData.specialSubject);
  } else if (userProfileData.grade === 'ثالثة ثانوي') {
    if (userProfileData.stream === 'علمي علوم') {
      subjects = ['عربي', 'إنجليزي', 'كيمياء', 'فيزياء', 'أحياء'];
    } else if (userProfileData.stream === 'علمي رياضة') {
      subjects = ['عربي', 'إنجليزي', 'كيمياء', 'فيزياء', 'الرياضيات البحتة والتطبيقية'];
    } else if (userProfileData.stream === 'أدبي') {
      subjects = ['تاريخ', 'جغرافيا', 'إحصاء', 'عربي', 'إنجليزي'];
    }
  }

  subjects.forEach(subj => {
    subjectSelect.innerHTML += `<option value="${subj}">${subj}</option>`;
  });
}

function onSubjectChange() {
  const subj = document.getElementById('subjectSelect').value;
  const grid = document.getElementById('actionsGrid');
  grid.innerHTML = '';

  if (!subj) return;

  let actions = [
    { id: 'explain', label: 'شرح الدرس المفصل', icon: 'fa-chalkboard-teacher' },
    { id: 'summary', label: 'تلخيص الزتونة', icon: 'fa-compress-alt' },
    { id: 'exam', label: 'امتحان تفاعلي داخل الموقع', icon: 'fa-vial' }
  ];

  if (subj === 'عربي') {
    actions.push({ id: 'arabic_tricks', label: 'تركات نحوية هامة', icon: 'fa-star' });
  }

  actions.forEach(act => {
    grid.innerHTML += `
      <div class="action-card" onclick="triggerAI('${act.id}', '${subj}')">
        <i class="fas ${act.icon} fa-2x" style="color:var(--gold-accent);"></i>
        <h4 style="margin-top:8px;">${act.label}</h4>
      </div>
    `;
  });
}

function switchInputTab(type) {
  if (type === 'pdf') {
    document.getElementById('btnTabPDF').classList.add('active');
    document.getElementById('btnTabText').classList.remove('active');
    document.getElementById('inputPDFBox').classList.remove('hidden');
    document.getElementById('inputTextBox').classList.add('hidden');
  } else {
    document.getElementById('btnTabText').classList.add('active');
    document.getElementById('btnTabPDF').classList.remove('active');
    document.getElementById('inputTextBox').classList.remove('hidden');
    document.getElementById('inputPDFBox').classList.add('hidden');
  }
}

// --- 5. قراءة ملفات الـ PDF الكبيرة (منهج الترم كامل) ---
function handlePDFUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('fileNameDisplay').innerText = "جاري قراءة وفهم كتاب الترم: " + file.name;
  pdfExtractedText = "";

  const reader = new FileReader();
  reader.onload = function() {
    const typedarray = new Uint8Array(this.result);
    pdfjsLib.getDocument(typedarray).promise.then(pdf => {
      // قراءة كل صفحات الكتاب المرفق للترم الأول (حتى 100 صفحة أو أكثر لضمان شمول المنهج)
      let maxPages = Math.min(pdf.numPages, 120);
      let textPromises = [];
      for (let i = 1; i <= maxPages; i++) {
        textPromises.push(
          pdf.getPage(i).then(page => 
            page.getTextContent().then(c => c.items.map(s => s.str).join(' '))
          )
        );
      }
      Promise.all(textPromises).then(texts => {
        pdfExtractedText = texts.join('\n').trim();
        document.getElementById('fileNameDisplay').innerText = `تم استيعاب منهج الترم كاملاً بنجاح (${file.name})`;
        alert('ممتاز! تم استيعاب وفهم منهج الترم الأول كاملاً من ملف الـ PDF بنجاح، يمكنك الآن طلب الشرح أو الامتحانات بثقة تامة!');
      });
    }).catch(err => {
      alert('حدث خطأ أثناء قراءة ملف الـ PDF!');
      console.error(err);
    });
  };
  reader.readAsArrayBuffer(file);
}

// --- 6. تنفيذ الذكاء الاصطناعي مع الاعتماد على سياق المنهج الكامل ---
async function triggerAI(actionType, subject) {
  if (userProfileData.credits <= 0) {
    showSubModal();
    return;
  }

  let textInput = document.getElementById('lessonTextInput').value.trim();
  // لو الطالب لم يرفع كتاب الترم كاملاً، نأخذ النص المكتوب، ولكن الأفضل رفع كتاب الترم في البداية
  let contextText = pdfExtractedText || textInput;

  if (!contextText) {
    alert('يرجى رفع ملف PDF لمنهج الترم الأول أو كتابة اسم الدرس المطلوب أولاً ليفهمه الذكاء الاصطناعي بدقة!');
    return;
  }

  const outputBox = document.getElementById('outputSection');
  const content = document.getElementById('aiOutputContent');
  const examContainer = document.getElementById('interactiveExamContainer');
  
  outputBox.classList.remove('hidden');
  examContainer.classList.add('hidden');
  content.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> جاري استرجاع المعلومات من منهج الترم وتحضير المحتوى بدقة...</p>';

  let difficulty = 'عادي';
  if (actionType === 'exam') {
    difficulty = prompt("اختر مستوى صعوبة الامتحان (عادي / مستويات عليا):", "عادي") || "عادي";
  }

  // برومبت ذكي وحاسم يضمن الاعتماد الكلي على محتوى كتاب الترم المرفق وعدم الهلوسة
  let promptText = `أنت أستاذ ومعلم خبير متمكن 100% في المنهج التعليمي المصري لصف (${userProfileData.grade}) - شعبة (${userProfileData.stream}).
المادة: ${subject}.

قواعد الإجابة الصارمة:
1. لقد تم تزويدك بمحتوى كتاب الترم الأول كاملاً أدناه. يجب أن تستند في كل إجاباتك، شروحاتك، تلخيصاتك، وأسئلتك حصرياً وبدقة متناهية على هذا المحتوى الرسمي ولا تقم بتأليف معلومات من خارج المقررات.
2. التزم بأسلوب المنهج المصري المدرسي مباشرة.

محتوى كتاب / منهج الترم الأول المعتمد:
"""
${contextText}
"""

الطلب الحالي من الطالب بشأن الدرس أو الموضوع المختار: "${textInput || 'اشرح الدرس الأساسي في المنهج'}"
المطلوب تنفيذه بدقة:
`;

  if (actionType === 'explain') {
    promptText += "قم بشرح هذا الدرس شرحاً منهجياً تفصيلياً ومبسطاً مستخرجاً مباشرة من منهج الترم المرفق.";
  } else if (actionType === 'summary') {
    promptText += "قدم ملخصاً شاملاً (الزتونة) لأهم القوانين والقواعد والمفاهيم الخاصة بهذا الدرس من منهج الترم.";
  } else if (actionType === 'arabic_tricks') {
    promptText += "استخرج وأشرح أهم التركات النحوية والبلاغية وإعراب الكلمات الواردة في منهج الترم.";
  } else if (actionType === 'exam') {
    promptText += `قم بتوليد امتحان تفاعلي مكون من 3 أسئلة اختيار من متعدد بمستوى صعوبة (${difficulty}) مستوحاة مباشرة من منهج الترم المرفق.
يجب أن يكون الرد حصرياً بصيغة JSON نظيفة وبدون أي نصوص أو ماركداون خارجي بهذا الشكل:
[
  {
    "question": "نص السؤال هنا؟",
    "options": ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"],
    "correct": 0,
    "explanation": "سبب الإجابة الصحيحة بناءً على منهج الترم"
  }
]`;
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
    });

    const data = await response.json();

    if (data && data.candidates && data.candidates.length > 0) {
      let resultText = data.candidates[0].content.parts[0].text;

      if (actionType === 'exam') {
        try {
          let cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
          let questions = JSON.parse(cleanJson);
          content.innerHTML = `<p style="color:var(--gold-accent); margin-bottom:10px;">تم توليد الامتحان التفاعلي المنهجي لمستوى (${difficulty}):</p>`;
          renderInteractiveExam(questions, examContainer);
        } catch (e) {
          content.innerHTML = `<div style="white-space: pre-wrap;">${resultText}</div>`;
        }
      } else {
        content.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.7;">${resultText}</div>`;
      }

      userProfileData.credits -= 1;
      document.getElementById('creditsLeft').innerText = userProfileData.credits;
      db.ref('users/' + currentUser.uid).update({ credits: userProfileData.credits });

    } else {
      content.innerHTML = '<p style="color:var(--gold-accent);">حدث خطأ في استجابة الخادم، حاول مرة أخرى.</p>';
    }

  } catch (err) {
    content.innerHTML = '<p style="color:var(--gold-accent);">خطأ في الاتصال بالشبكة.</p>';
  }
}

// --- 7. RENDER INTERACTIVE EXAM ---
function renderInteractiveExam(questions, container) {
  container.classList.remove('hidden');
  let html = '<div class="exam-box">';
  
  questions.forEach((q, qIndex) => {
    html += `
      <div class="exam-question-card" style="background:rgba(0,0,0,0.3); padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid var(--olive-light);">
        <p style="font-weight:bold; margin-bottom:10px; color:var(--gold-accent);">${qIndex + 1}. ${q.question}</p>
        <div class="options-list" style="display:flex; flex-direction:column; gap:8px;">
    `;
    q.options.forEach((opt, oIndex) => {
      html += `
        <label style="cursor:pointer; padding:8px; background:rgba(255,255,255,0.05); border-radius:5px; display:block;">
          <input type="radio" name="question_${qIndex}" value="${oIndex}" onclick="checkAnswer(${qIndex}, ${oIndex}, ${q.correct}, '${encodeURIComponent(q.explanation)}')"> 
          ${opt}
        </label>
      `;
    });
    html += `</div><div id="feedback_${qIndex}" style="margin-top:8px; font-size:0.9rem;"></div></div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function checkAnswer(qIdx, selected, correct, encodedExp) {
  const feedbackDiv = document.getElementById(`feedback_${qIdx}`);
  const explanation = decodeURIComponent(encodedExp);
  
  if (selected === correct) {
    feedbackDiv.innerHTML = `<span style="color:#4ADE80; font-weight:bold;"><i class="fas fa-check-circle"></i> إجابة صحيحة! ${explanation}</span>`;
  } else {
    feedbackDiv.innerHTML = `<span style="color:#F87171; font-weight:bold;"><i class="fas fa-times-circle"></i> إجابة خاطئة. ${explanation}</span>`;
  }
}

function showSubModal() { document.getElementById('subModal').classList.remove('hidden'); }
function closeSubModal() { document.getElementById('subModal').classList.add('hidden'); }

function copyOutput() {
  const text = document.getElementById('aiOutputContent').innerText;
  navigator.clipboard.writeText(text);
  alert('تم نسخ النص بنجاح!');
}

// Background Particle Effects
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = Array.from({length: 25}, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 6 + 2,
  d: Math.random() * 1
}));

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'rgba(107, 142, 35, 0.12)';
  ctx.beginPath();
  particles.files = []; // safe guard
  particles.forEach(p => {
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    p.y -= p.d;
    if(p.y < 0) p.y = canvas.height;
  });
  ctx.fill();
  requestAnimationFrame(draw);
}
draw();
