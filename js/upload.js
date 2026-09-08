let selectedFile = null;
let currentUploadId = null;
let extractedRecords = []; // Global storage of active preview records

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth('admin');
  if (!user) return;

  loadExams();
  setupDragAndDrop();
});

// Load active exam selections
async function loadExams() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/exams`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      const select = document.getElementById('upload-exam');
      select.innerHTML = '<option value="">-- Choose Exam --</option>';
      result.data.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex._id;
        option.innerText = `${ex.name} (${ex.academicYear}) - ${ex.branch} ${ex.semester}`;
        select.appendChild(option);
      });
    }
  } catch (err) {
    showToast('Failed to load exams dropdown list.', 'error');
  }
}

// Drag and drop events setup
function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const display = document.getElementById('file-name-display');
  const processBtn = document.getElementById('btn-process');

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelection(fileInput.files[0]);
    }
  });
}

function handleFileSelection(file) {
  const display = document.getElementById('file-name-display');
  const processBtn = document.getElementById('btn-process');

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Only PDF files are allowed.', 'error');
    selectedFile = null;
    display.innerText = '';
    processBtn.disabled = true;
    return;
  }

  selectedFile = file;
  display.innerText = `Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  validateFormState();
}

document.getElementById('upload-exam').addEventListener('change', validateFormState);

function validateFormState() {
  const examId = document.getElementById('upload-exam').value;
  const processBtn = document.getElementById('btn-process');
  processBtn.disabled = !(selectedFile && examId);
}

// Process PDF Upload
async function processUpload() {
  const examId = document.getElementById('upload-exam').value;
  if (!selectedFile || !examId) return;

  const uploadPanel = document.getElementById('upload-panel');
  const loadingPanel = document.getElementById('loading-panel');
  
  // Show spinner
  uploadPanel.style.display = 'none';
  loadingPanel.style.display = 'block';

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('examId', examId);

  try {
    const response = await fetch(`${API_BASE_URL}/api/results/upload-pdf`, { credentials: 'include', 
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    loadingPanel.style.display = 'none';

    if (response.ok && result.success) {
      currentUploadId = result.uploadId;
      extractedRecords = result.data;
      showToast(result.message, 'success');
      renderPreviewTable();
    } else {
      showToast(result.message || 'PDF extraction failed.', 'error');
      resetUpload();
    }
  } catch (err) {
    loadingPanel.style.display = 'none';
    showToast('Network error processing PDF.', 'error');
    resetUpload();
  }
}

// Render Extracted Records in validation preview grid
function renderPreviewTable() {
  const previewPanel = document.getElementById('preview-panel');
  const tbody = document.querySelector('#preview-table tbody');
  tbody.innerHTML = '';

  extractedRecords.forEach((rec, idx) => {
    const tr = document.createElement('tr');
    const isInvalid = rec.status === 'Invalid';
    if (isInvalid) {
      tr.className = 'record-invalid';
    }

    const errorsHTML = rec.errors.map(err => `<span class="error-tag">${err}</span>`).join('');
    const statusText = isInvalid ? `Invalid ${errorsHTML}` : 'Valid';

    tr.innerHTML = `
      <td>
        <div class="editable-cell" contenteditable="true" onblur="updateCell(${idx}, 'rollNumber', this.innerText)">
          ${rec.rollNumber}
        </div>
      </td>
      <td>${rec.studentName}</td>
      <td>
        <div class="editable-cell" contenteditable="true" onblur="updateCell(${idx}, 'subjectCode', this.innerText)">
          ${rec.subjectCode}
        </div>
      </td>
      <td>${rec.subjectName}</td>
      <td>
        <div class="editable-cell" contenteditable="true" onblur="updateCell(${idx}, 'grade', this.innerText)">
          ${rec.grade}
        </div>
      </td>
      <td><strong>${statusText}</strong></td>
      <td style="text-align: right;">
        <button class="btn btn-danger btn-icon" onclick="deletePreviewRow(${idx})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  previewPanel.style.display = 'block';
}

// Inline edit handler
async function updateCell(index, field, newValue) {
  const val = newValue.trim().toUpperCase();
  extractedRecords[index][field] = val;

  // Re-validate this modified row via API mock or simple query local checks
  // To keep validations accurate, we perform a clean server check by sending the modified item 
  // or re-running checks inside our render function locally (e.g. valid grades)
  if (field === 'grade') {
    const validGrades = ['O', 'A+', 'A', 'B+', 'B', 'C', 'F'];
    const idx = extractedRecords[index].errors.indexOf('Invalid Grade value');
    const hasGradeErr = extractedRecords[index].errors.some(e => e.includes('Invalid Grade'));
    
    // Clear old grade errors
    extractedRecords[index].errors = extractedRecords[index].errors.filter(e => !e.includes('Invalid Grade'));

    if (!validGrades.includes(val)) {
      extractedRecords[index].errors.push(`Invalid Grade value: "${val}"`);
    }
  }

  // If editing roll/subject code, let's suggest saving draft will run final verification on server.
  // We can update the row UI status accordingly.
  if (extractedRecords[index].errors.length === 0) {
    extractedRecords[index].status = 'Valid';
  } else {
    extractedRecords[index].status = 'Invalid';
  }

  renderPreviewTable();
}

function deletePreviewRow(index) {
  extractedRecords.splice(index, 1);
  renderPreviewTable();
}

// Save draft results
async function saveExtractedData() {
  // Check if any invalid rows remain
  const hasInvalid = extractedRecords.some(r => r.status === 'Invalid');
  if (hasInvalid) {
    showToast('Cannot save. Please fix or delete all invalid rows (highlighted in red) first.', 'warning');
    return;
  }

  if (extractedRecords.length === 0) {
    showToast('No records to save.', 'warning');
    return;
  }

  const examId = document.getElementById('upload-exam').value;
  const btnSave = document.getElementById('btn-save-draft');
  btnSave.disabled = true;
  btnSave.innerText = 'Saving...';

  try {
    const response = await fetch(`${API_BASE_URL}/api/results/save`, { credentials: 'include', 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examId,
        uploadId: currentUploadId,
        records: extractedRecords
      })
    });

    const result = await response.json();
    if (response.ok && result.success) {
      showToast(result.message, 'success');
      setTimeout(() => {
        window.location.href = 'results.html';
      }, 1500);
    } else {
      showToast(result.message || 'Failed to save results.', 'error');
      btnSave.disabled = false;
      btnSave.innerText = 'Save as Draft';
    }
  } catch (err) {
    showToast('Network error saving draft results.', 'error');
    btnSave.disabled = false;
    btnSave.innerText = 'Save as Draft';
  }
}

function resetUpload() {
  selectedFile = null;
  currentUploadId = null;
  extractedRecords = [];
  
  document.getElementById('file-input').value = '';
  document.getElementById('file-name-display').innerText = '';
  document.getElementById('upload-exam').value = '';
  document.getElementById('btn-process').disabled = true;

  document.getElementById('upload-panel').style.display = 'block';
  document.getElementById('preview-panel').style.display = 'none';
}
