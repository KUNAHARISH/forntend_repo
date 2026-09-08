document.addEventListener('DOMContentLoaded', async () => {
  // Guard route for admin only
  const user = await checkAuth('admin');
  if (!user) return;

  // Load dashboard metrics
  loadMetrics();
});

async function loadMetrics() {
  try {
    // 1. Fetch Students
    const studentRes = await fetch(`${API_BASE_URL}/api/students`, { credentials: 'include' });
    const studentData = await studentRes.json();
    const studentsList = studentData.success ? studentData.data : [];
    document.getElementById('stat-students').innerText = studentsList.length;

    // 2. Fetch Subjects
    const subjectRes = await fetch(`${API_BASE_URL}/api/subjects`, { credentials: 'include' });
    const subjectData = await subjectRes.json();
    const subjectsList = subjectData.success ? subjectData.data : [];
    document.getElementById('stat-subjects').innerText = subjectsList.length;

    // 3. Fetch Exams
    const examRes = await fetch(`${API_BASE_URL}/api/exams`, { credentials: 'include' });
    const examData = await examRes.json();
    const examsList = examData.success ? examData.data : [];
    document.getElementById('stat-exams').innerText = examsList.length;

    // 4. Fetch Published & Draft Results
    const publishedRes = await fetch(`${API_BASE_URL}/api/results?status=PUBLISHED`, { credentials: 'include' });
    const publishedData = await publishedRes.json();
    document.getElementById('stat-published').innerText = publishedData.success ? publishedData.count : 0;

    const draftRes = await fetch(`${API_BASE_URL}/api/results?status=DRAFT`, { credentials: 'include' });
    const draftData = await draftRes.json();
    document.getElementById('stat-drafts').innerText = draftData.success ? draftData.count : 0;

    // Populate recent students table (top 5)
    populateRecentStudents(studentsList.slice(-5).reverse());

    // Populate recent exams table (top 5)
    populateRecentExams(examsList.slice(-5));

  } catch (err) {
    console.error('Error loading dashboard statistics:', err);
    showToast('Failed to load dashboard metrics.', 'error');
  }
}

function populateRecentStudents(students) {
  const tbody = document.querySelector('#recent-students-table tbody');
  tbody.innerHTML = '';
  
  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No students registered yet.</td></tr>`;
    return;
  }

  students.forEach(st => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${st.rollNumber}</strong></td>
      <td>${st.name}</td>
      <td><span style="font-size: 0.85rem; font-weight: bold; background: #e2e8f0; padding: 3px 8px; border-radius: 4px;">${st.branch}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function populateRecentExams(exams) {
  const tbody = document.querySelector('#recent-exams-table tbody');
  tbody.innerHTML = '';

  if (exams.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No exams configured yet.</td></tr>`;
    return;
  }

  exams.forEach(ex => {
    const tr = document.createElement('tr');
    const isPublished = ex.status === 'PUBLISHED';
    const badgeStyle = isPublished 
      ? 'background-color: var(--success-light); color: var(--success);' 
      : 'background-color: var(--warning-light); color: var(--warning);';

    tr.innerHTML = `
      <td>${ex.name}</td>
      <td>${ex.semester}</td>
      <td><span style="font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 4px; ${badgeStyle}">${ex.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}
