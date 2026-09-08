let activeResultsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth('admin');
  if (!user) return;

  await fetchAndPopulateBranches();
  loadExamsDropdown();
  loadResults();
});

// Load exams into filters list
async function loadExamsDropdown() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      const select = document.getElementById('filter-exam');
      select.innerHTML = '<option value="">All Exams</option>';
      result.data.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex._id;
        option.innerText = ex.name;
        select.appendChild(option);
      });
    }
  } catch (e) {}
}

// Fetch results based on filters
async function loadResults() {
  try {
    const rollNumber = document.getElementById('search-roll').value.trim();
    const examId = document.getElementById('filter-exam').value;
    const branch = document.getElementById('filter-branch').value;
    const semester = document.getElementById('filter-semester').value;
    const status = document.getElementById('filter-status').value;

    const queryParams = [];
    if (rollNumber) queryParams.push(`rollNumber=${encodeURIComponent(rollNumber)}`);
    if (examId) queryParams.push(`examId=${encodeURIComponent(examId)}`);
    if (branch) queryParams.push(`branch=${encodeURIComponent(branch)}`);
    if (semester) queryParams.push(`semester=${encodeURIComponent(semester)}`);
    if (status) queryParams.push(`status=${encodeURIComponent(status)}`);

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    const res = await fetch(`${API_BASE_URL}/api/results${queryString}`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      activeResultsList = result.data;
      renderResults(activeResultsList);
    } else {
      showToast(result.message || 'Failed to fetch results list.', 'error');
    }
  } catch (err) {
    showToast('Network error loading results list.', 'error');
  }
}

function renderResults(results) {
  const tbody = document.querySelector('#results-table tbody');
  tbody.innerHTML = '';

  if (results.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No student result records found.</td></tr>`;
    return;
  }

  results.forEach(resRecord => {
    const tr = document.createElement('tr');
    const isPublished = resRecord.status === 'PUBLISHED';
    const badgeClass = isPublished ? 'success' : 'warning';
    const publishBtnText = isPublished ? 'Unpublish' : 'Publish';

    tr.innerHTML = `
      <td><strong>${resRecord.student ? resRecord.student.rollNumber : '-'}</strong></td>
      <td>${resRecord.student ? resRecord.student.name : 'Unknown Student'}</td>
      <td>${resRecord.exam ? resRecord.exam.name : '-'}</td>
      <td><strong>${resRecord.sgpa.toFixed(2)}</strong></td>
      <td><strong>${resRecord.cgpa.toFixed(2)}</strong></td>
      <td><span style="font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 4px; background-color: var(--${badgeClass}-light); color: var(--${badgeClass});">${resRecord.status}</span></td>
      <td style="text-align: right;">
        <div class="action-buttons" style="justify-content: flex-end;">
          <button class="btn btn-secondary btn-icon" onclick="viewResultDetail('${resRecord._id}')">View</button>
          <button class="btn btn-primary btn-icon" onclick="togglePublish('${resRecord._id}', ${isPublished})">${publishBtnText}</button>
          <a href="/api/results/${resRecord._id}/pdf" class="btn btn-success btn-icon">PDF</a>
          <button class="btn btn-danger btn-icon" onclick="confirmDelete('${resRecord._id}', '${resRecord.student ? resRecord.student.rollNumber : 'this Student'}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Toggle Publish / Unpublish Result
async function togglePublish(id, isPublished) {
  const endpoint = `/api/results/${id}/${isPublished ? 'unpublish' : 'publish'}`;
  try {
    const response = await fetch(endpoint, { method: 'PUT' });
    const result = await response.json();
    if (result.success) {
      showToast(isPublished ? 'Result reverted to draft status.' : 'Result successfully published to student portal!', 'success');
      loadResults();
    } else {
      showToast(result.message || 'Error updating status.', 'error');
    }
  } catch (err) {
    showToast('Network error updating result status.', 'error');
  }
}

// Delete result
async function confirmDelete(id, rollNumber) {
  if (confirm(`Are you sure you want to delete result for student: ${rollNumber}?`)) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/results/${id}`, { credentials: 'include',  method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        showToast('Student result deleted.', 'success');
        loadResults();
      } else {
        showToast(result.message || 'Error deleting result record.', 'error');
      }
    } catch (err) {
      showToast('Network error deleting result record.', 'error');
    }
  }
}

// View Result Memo details modal
function viewResultDetail(id) {
  const record = activeResultsList.find(r => r._id === id);
  if (!record) return;

  const modal = document.getElementById('result-detail-modal');
  const modalBody = document.getElementById('memo-modal-body');
  const downloadBtn = document.getElementById('modal-download-pdf-btn');

  // Configure PDF download link
  downloadBtn.onclick = () => {
    window.location.href = `/api/results/${record._id}/pdf`;
  };

  // Build subjects table rows
  let subjectsRows = '';
  let overallPass = true;
  record.subjects.forEach(sub => {
    const isF = sub.grade === 'F';
    if (isF) overallPass = false;
    const gradeStyle = isF ? 'color: var(--danger); font-weight: bold;' : '';
    const resultStyle = isF ? 'color: var(--danger);' : 'color: var(--success);';

    subjectsRows += `
      <tr>
        <td><strong>${sub.subjectCode}</strong></td>
        <td>${sub.subjectName}</td>
        <td style="text-align: center;">${sub.credits}</td>
        <td style="text-align: center; ${gradeStyle}">${sub.grade}</td>
        <td style="text-align: center; ${resultStyle}"><strong>${sub.result}</strong></td>
      </tr>
    `;
  });

  const passBadgeClass = overallPass ? 'pass' : 'fail';
  const passBadgeText = overallPass ? 'PASSED' : 'FAILED';

  modalBody.innerHTML = `
    <div class="memo-header" style="text-align: center; border-bottom: 2px solid #1a365d; padding-bottom: 15px; margin-bottom: 20px;">
      <img src="../images/banner.png" alt="Sri Sivani College of Engineering" style="width: 100%; max-width: 750px; height: auto;">
      <div class="doc-title" style="font-size: 1.2rem; font-weight: 800; margin-top: 15px; text-transform: uppercase; color: #1a365d; letter-spacing: 0.5px;">Student Semester Grade Sheet</div>
    </div>

    <div class="memo-meta">
      <table>
        <tr>
          <td class="lbl">Student Name:</td>
          <td class="val">${record.student ? record.student.name : '-'}</td>
          <td class="lbl">Roll Number:</td>
          <td class="val">${record.student ? record.student.rollNumber : '-'}</td>
        </tr>
        <tr>
          <td class="lbl">Branch:</td>
          <td class="val">${record.branch}</td>
          <td class="lbl">Year & Section:</td>
          <td class="val">${record.year} Year - Sec ${record.section}</td>
        </tr>
        <tr>
          <td class="lbl">Semester:</td>
          <td class="val">${record.semester}</td>
          <td class="lbl">Academic Year:</td>
          <td class="val">${record.academicYear}</td>
        </tr>
      </table>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Subject Name</th>
            <th style="text-align: center;">Credits</th>
            <th style="text-align: center;">Grade</th>
            <th style="text-align: center;">Result</th>
          </tr>
        </thead>
        <tbody>
          ${subjectsRows}
        </tbody>
      </table>
    </div>

    <div class="memo-gpa-container ${overallPass ? '' : 'fail'}">
      <div class="memo-gpa-item">
        <label>SGPA</label>
        <span>${record.sgpa.toFixed(2)}</span>
      </div>
      <div class="memo-gpa-item">
        <label>CGPA</label>
        <span>${record.cgpa.toFixed(2)}</span>
      </div>
      <div class="memo-status-badge ${passBadgeClass}">${passBadgeText}</div>
    </div>
  `;

  modal.classList.add('active');
}

function closeResultModal() {
  document.getElementById('result-detail-modal').classList.remove('active');
}

// Export filtered list to Excel
function exportToExcel() {
  const examId = document.getElementById('filter-exam').value;
  const branch = document.getElementById('filter-branch').value;
  const semester = document.getElementById('filter-semester').value;
  const status = document.getElementById('filter-status').value;

  const queryParams = [];
  if (examId) queryParams.push(`examId=${encodeURIComponent(examId)}`);
  if (branch) queryParams.push(`branch=${encodeURIComponent(branch)}`);
  if (semester) queryParams.push(`semester=${encodeURIComponent(semester)}`);
  if (status) queryParams.push(`status=${encodeURIComponent(status)}`);

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  window.location.href = `/api/results/export/excel${queryString}`;
}

// Bulk publish currently filtered drafts
async function publishAll() {
  const examId = document.getElementById('filter-exam').value;
  const branch = document.getElementById('filter-branch').value;
  const semester = document.getElementById('filter-semester').value;

  const queryParams = [];
  if (examId) queryParams.push(`examId=${encodeURIComponent(examId)}`);
  if (branch) queryParams.push(`branch=${encodeURIComponent(branch)}`);
  if (semester) queryParams.push(`semester=${encodeURIComponent(semester)}`);

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

  if (confirm('Are you sure you want to publish all currently filtered draft result sheets to the student portal?')) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/results/publish-all${queryString}`, { credentials: 'include',  method: 'PUT' });
      const result = await response.json();
      if (result.success) {
        showToast(result.message || 'All drafts published successfully!', 'success');
        loadResults();
      } else {
        showToast(result.message || 'Failed to bulk-publish results.', 'error');
      }
    } catch (err) {
      showToast('Network error during bulk publishing.', 'error');
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
    }
  } catch (err) {
    console.error('Error fetching branches:', err);
  }
}
