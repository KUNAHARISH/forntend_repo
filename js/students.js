let allStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth('admin');
  if (!user) return;

  await fetchAndPopulateBranches();
  loadStudents();

  // Attach modal form submit listener
  document.getElementById('student-form').addEventListener('submit', handleFormSubmit);
});

async function loadStudents() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/students`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      allStudents = result.data;
      renderStudents(allStudents);
    } else {
      showToast(result.message || 'Failed to fetch students.', 'error');
    }
  } catch (err) {
    showToast('Network error loading students.', 'error');
  }
}

function renderStudents(students) {
  const tbody = document.querySelector('#students-table tbody');
  tbody.innerHTML = '';

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No student records found.</td></tr>`;
    return;
  }

  students.forEach(st => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${st.rollNumber}</strong></td>
      <td>${st.name}</td>
      <td>${st.email}</td>
      <td><span style="font-size: 0.85rem; font-weight: bold; background: #e6f2f2; color: var(--primary); padding: 3px 8px; border-radius: 4px;">${st.branch}</span></td>
      <td>${st.semester} / ${st.section}</td>
      <td>${st.phone || '-'}</td>
      <td style="text-align: right;">
        <div class="action-buttons" style="justify-content: flex-end;">
          <button class="btn btn-secondary btn-icon" onclick="openEditModal('${st._id}')">Edit</button>
          <button class="btn btn-danger btn-icon" onclick="confirmDelete('${st._id}', '${st.rollNumber}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterStudents() {
  const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
  const branchVal = document.getElementById('filter-branch').value;
  const semVal = document.getElementById('filter-semester').value;
  const secVal = document.getElementById('filter-section').value;

  const filtered = allStudents.filter(st => {
    const matchesSearch = !searchVal || 
      st.name.toLowerCase().includes(searchVal) ||
      st.rollNumber.toLowerCase().includes(searchVal) ||
      st.email.toLowerCase().includes(searchVal);
    
    const matchesBranch = !branchVal || st.branch === branchVal;
    const matchesSem = !semVal || st.semester === semVal;
    const matchesSec = !secVal || st.section === secVal;

    return matchesSearch && matchesBranch && matchesSem && matchesSec;
  });

  renderStudents(filtered);
}

// Modal actions
const modal = document.getElementById('student-modal');

function openAddModal() {
  document.getElementById('modal-title').innerText = 'Add New Student';
  document.getElementById('student-id').value = '';
  document.getElementById('student-form').reset();
  
  // Roll number editable
  document.getElementById('rollNumber').readOnly = false;
  
  // Password required for creation
  const passInput = document.getElementById('password');
  passInput.required = true;
  passInput.placeholder = 'Enter password for login';
  document.getElementById('password-label').innerText = 'Password *';
  
  modal.classList.add('active');
}

function openEditModal(id) {
  const student = allStudents.find(st => st._id === id);
  if (!student) return;

  document.getElementById('modal-title').innerText = `Edit Student Profile: ${student.rollNumber}`;
  document.getElementById('student-id').value = student._id;
  document.getElementById('rollNumber').value = student.rollNumber;
  document.getElementById('rollNumber').readOnly = true; // Lock roll number in edit
  document.getElementById('name').value = student.name;
  document.getElementById('email').value = student.email;
  
  // Password optional in edit
  const passInput = document.getElementById('password');
  passInput.required = false;
  passInput.value = '';
  passInput.placeholder = 'Leave blank to keep unchanged';
  document.getElementById('password-label').innerText = 'Change Password';

  document.getElementById('branch').value = student.branch;
  document.getElementById('year').value = student.year;
  document.getElementById('semester').value = student.semester;
  document.getElementById('section').value = student.section;
  document.getElementById('phone').value = student.phone || '';

  modal.classList.add('active');
}

function closeModal() {
  modal.classList.remove('active');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('student-id').value;
  const payload = {
    rollNumber: document.getElementById('rollNumber').value.toUpperCase().trim(),
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    branch: document.getElementById('branch').value,
    year: document.getElementById('year').value,
    semester: document.getElementById('semester').value,
    section: document.getElementById('section').value,
    phone: document.getElementById('phone').value.trim()
  };

  const passVal = document.getElementById('password').value;
  if (passVal) {
    payload.password = passVal;
  }

  try {
    let response;
    if (id) {
      // Edit
      response = await fetch(`${API_BASE_URL}/api/students/${id}`, { credentials: 'include', 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Add
      response = await fetch(`${API_BASE_URL}/api/students`, { credentials: 'include', 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const result = await response.json();
    if (result.success) {
      showToast(id ? 'Student profile updated!' : 'Student registered successfully!', 'success');
      closeModal();
      loadStudents();
    } else {
      showToast(result.message || 'Error saving student record.', 'error');
    }
  } catch (err) {
    showToast('Network error processing request.', 'error');
  }
}

async function confirmDelete(id, rollNumber) {
  if (confirm(`Are you sure you want to delete student ${rollNumber}?\nThis will permanently remove their user credentials, profile and examination results.`)) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${id}`, { credentials: 'include',  method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        showToast(`Student ${rollNumber} deleted successfully.`, 'success');
        loadStudents();
      } else {
        showToast(result.message || 'Error deleting student.', 'error');
      }
    } catch (err) {
      showToast('Network error deleting student.', 'error');
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
