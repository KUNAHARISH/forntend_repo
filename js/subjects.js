let allSubjects = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth('admin');
  if (!user) return;

  await fetchAndPopulateBranches();
  loadSubjects();

  document.getElementById('subject-form').addEventListener('submit', handleFormSubmit);
});

async function loadSubjects() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/subjects`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      allSubjects = result.data;
      renderSubjects(allSubjects);
    } else {
      showToast(result.message || 'Failed to fetch subjects.', 'error');
    }
  } catch (err) {
    showToast('Network error loading subjects.', 'error');
  }
}

function renderSubjects(subjects) {
  const tbody = document.querySelector('#subjects-table tbody');
  tbody.innerHTML = '';

  if (subjects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No subject records found.</td></tr>`;
    return;
  }

  subjects.forEach(sub => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${sub.subjectCode}</strong></td>
      <td>${sub.subjectName}</td>
      <td><span style="font-weight: bold; color: var(--secondary);">${sub.credits} Credits</span></td>
      <td>${sub.branch}</td>
      <td>Semester ${sub.semester}</td>
      <td style="text-align: right;">
        <div class="action-buttons" style="justify-content: flex-end;">
          <button class="btn btn-secondary btn-icon" onclick="openEditModal('${sub._id}')">Edit</button>
          <button class="btn btn-danger btn-icon" onclick="confirmDelete('${sub._id}', '${sub.subjectCode}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterSubjects() {
  const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
  const branchVal = document.getElementById('filter-branch').value;
  const semVal = document.getElementById('filter-semester').value;

  const filtered = allSubjects.filter(sub => {
    const matchesSearch = !searchVal || 
      sub.subjectCode.toLowerCase().includes(searchVal) ||
      sub.subjectName.toLowerCase().includes(searchVal);
    
    const matchesBranch = !branchVal || sub.branch === branchVal;
    const matchesSem = !semVal || sub.semester === semVal;

    return matchesSearch && matchesBranch && matchesSem;
  });

  renderSubjects(filtered);
}

// Modal controls
const modal = document.getElementById('subject-modal');

function openAddModal() {
  document.getElementById('modal-title').innerText = 'Add New Subject';
  document.getElementById('subject-id').value = '';
  document.getElementById('subject-form').reset();
  document.getElementById('subjectCode').readOnly = false;
  modal.classList.add('active');
}

function openEditModal(id) {
  const subject = allSubjects.find(sub => sub._id === id);
  if (!subject) return;

  document.getElementById('modal-title').innerText = `Edit Subject: ${subject.subjectCode}`;
  document.getElementById('subject-id').value = subject._id;
  document.getElementById('subjectCode').value = subject.subjectCode;
  document.getElementById('subjectCode').readOnly = true;
  document.getElementById('subjectName').value = subject.subjectName;
  document.getElementById('credits').value = subject.credits;
  document.getElementById('branch').value = subject.branch;
  document.getElementById('semester').value = subject.semester;

  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('subject-id').value;
  const payload = {
    subjectCode: document.getElementById('subjectCode').value.toUpperCase().trim(),
    subjectName: document.getElementById('subjectName').value.trim(),
    credits: document.getElementById('credits').value,
    branch: document.getElementById('branch').value,
    semester: document.getElementById('semester').value
  };

  try {
    let response;
    if (id) {
      response = await fetch(`${API_BASE_URL}/api/subjects/${id}`, { credentials: 'include', 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      response = await fetch(`${API_BASE_URL}/api/subjects`, { credentials: 'include', 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const result = await response.json();
    if (result.success) {
      showToast(id ? 'Subject updated successfully!' : 'Subject added successfully!', 'success');
      closeModal();
      loadSubjects();
    } else {
      showToast(result.message || 'Error saving subject details.', 'error');
    }
  } catch (err) {
    showToast('Network error processing request.', 'error');
  }
}

async function confirmDelete(id, code) {
  if (confirm(`Are you sure you want to delete subject: ${code}?`)) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subjects/${id}`, { credentials: 'include',  method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        showToast(`Subject ${code} deleted.`, 'success');
        loadSubjects();
      } else {
        showToast(result.message || 'Error deleting subject.', 'error');
      }
    } catch (err) {
      showToast('Network error deleting subject.', 'error');
    }
  }
}

async function fetchAndPopulateBranches() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams/branches`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      const branches = result.data;
      
      const filterSelect = document.getElementById('filter-branch');
      if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Branches</option>';
        branches.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b;
          opt.innerText = b;
          filterSelect.appendChild(opt);
        });
      }
      
      const datalist = document.getElementById('branch-list');
      if (datalist) {
        datalist.innerHTML = '';
        branches.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b;
          datalist.appendChild(opt);
        });
      }
    }
  } catch (err) {
    console.error('Error fetching branches:', err);
  }
}
