let allExams = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth('admin');
  if (!user) return;

  populateAcademicYears();
  loadExams();

  document.getElementById('exam-form').addEventListener('submit', handleFormSubmit);
});

async function loadExams() {
  try {
    const semester = document.getElementById('filter-semester').value;
    const status = document.getElementById('filter-status').value;
    const examType = document.getElementById('filter-examType') ? document.getElementById('filter-examType').value : '';

    let queryParams = [];
    if (semester) queryParams.push(`semester=${encodeURIComponent(semester)}`);
    if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
    if (examType) queryParams.push(`examType=${encodeURIComponent(examType)}`);

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const res = await fetch(`${API_BASE_URL}/api/exams${queryString}`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      allExams = result.data;
      renderExams(allExams);
    } else {
      showToast(result.message || 'Failed to fetch exams.', 'error');
    }
  } catch (err) {
    showToast('Network error loading exams.', 'error');
  }
}

function renderExams(exams) {
  const tbody = document.querySelector('#exams-table tbody');
  tbody.innerHTML = '';

  if (exams.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No exams registered yet.</td></tr>`;
    return;
  }

  exams.forEach(ex => {
    const tr = document.createElement('tr');
    const isPublished = ex.status === 'PUBLISHED';
    const isDraft = ex.status === 'DRAFT';
    
    let badgeClass = 'warning';
    if (isPublished) badgeClass = 'success';
    if (ex.status === 'CLOSED') badgeClass = 'info';

    let typeBadgeColor = 'background-color: #e0f2fe; color: #0369a1;'; // Regular
    if (ex.examType === 'SUPPLEMENTARY') typeBadgeColor = 'background-color: #fef3c7; color: #b45309;';
    if (ex.examType === 'REVALUATION') typeBadgeColor = 'background-color: #f3e8ff; color: #6b21a8;';

    const formattedDate = new Date(ex.examDate).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    const displayType = ex.examType || 'REGULAR';

    tr.innerHTML = `
      <td><strong>${ex.name}</strong></td>
      <td><span style="font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; ${typeBadgeColor}">${displayType}</span></td>
      <td>${ex.academicYear}</td>
      <td>Semester ${ex.semester}</td>
      <td>${formattedDate}</td>
      <td><span style="font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 4px; background-color: var(--${badgeClass}-light); color: var(--${badgeClass});">${ex.status}</span></td>
      <td style="text-align: right;">
        <div class="action-buttons" style="justify-content: flex-end;">
          <button class="btn btn-secondary btn-icon" onclick="openEditModal('${ex._id}')">Edit</button>
          <button class="btn btn-danger btn-icon" onclick="confirmDelete('${ex._id}', '${ex.name}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Modal controls
const modal = document.getElementById('exam-modal');

function openAddModal() {
  document.getElementById('modal-title').innerText = 'Create New Exam';
  document.getElementById('exam-id').value = '';
  document.getElementById('exam-form').reset();
  
  if (document.getElementById('examType')) {
    document.getElementById('examType').value = 'REGULAR';
  }

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('examDate').value = today;

  modal.classList.add('active');
}

function openEditModal(id) {
  const exam = allExams.find(ex => ex._id === id);
  if (!exam) return;

  document.getElementById('modal-title').innerText = `Edit Exam Configuration`;
  document.getElementById('exam-id').value = exam._id;
  if (document.getElementById('examType')) {
    document.getElementById('examType').value = exam.examType || 'REGULAR';
  }
  document.getElementById('academicYear').value = exam.academicYear;
  
  const formattedDate = new Date(exam.examDate).toISOString().split('T')[0];
  document.getElementById('examDate').value = formattedDate;

  document.getElementById('year').value = exam.year;
  document.getElementById('semester').value = exam.semester;
  document.getElementById('status').value = exam.status;

  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('exam-id').value;
  const payload = {
    examType: document.getElementById('examType') ? document.getElementById('examType').value : 'REGULAR',
    academicYear: document.getElementById('academicYear').value,
    examDate: document.getElementById('examDate').value,
    year: document.getElementById('year').value,
    semester: document.getElementById('semester').value,
    status: document.getElementById('status').value
  };

  try {
    let response;
    if (id) {
      response = await fetch(`${API_BASE_URL}/api/exams/${id}`, { credentials: 'include', 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      response = await fetch(`${API_BASE_URL}/api/exams`, { credentials: 'include', 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const result = await response.json();
    if (result.success) {
      showToast(id ? 'Exam updated successfully!' : 'Exam created successfully!', 'success');
      closeModal();
      loadExams();
    } else {
      showToast(result.message || 'Error saving exam schedule.', 'error');
    }
  } catch (err) {
    showToast('Network error processing request.', 'error');
  }
}

async function confirmDelete(id, name) {
  if (confirm(`Are you sure you want to delete the exam schedule: "${name}"?\nWarning: This will permanently delete ALL student grade results linked to this exam!`)) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/exams/${id}`, { credentials: 'include',  method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        showToast(`Exam "${name}" deleted.`, 'success');
        loadExams();
      } else {
        showToast(result.message || 'Error deleting exam.', 'error');
      }
    } catch (err) {
      showToast('Network error deleting exam.', 'error');
    }
  }
}

function populateAcademicYears() {
  const select = document.getElementById('academicYear');
  if (!select) return;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const startYear = Math.max(2025, currentYear - 8); // First batch is 2025-2026 (allows 8 years backlog/supplementary window)
  const endYear = currentYear + 4;
  
  select.innerHTML = '';
  
  for (let y = endYear; y >= startYear; y--) {
    const optionText = `${y}-${y + 1}`;
    const option = document.createElement('option');
    option.value = optionText;
    option.innerText = optionText;
    select.appendChild(option);
  }
  
  let activeYear = currentYear;
  if (currentMonth < 6) {
    activeYear = currentYear - 1;
  }
  select.value = `${activeYear}-${activeYear + 1}`;
}
