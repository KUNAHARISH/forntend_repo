document.addEventListener('DOMContentLoaded', async () => {
  // Guard route for student role
  const user = await checkAuth('student');
  if (!user) return;

  // Set navbar display names
  const welcomeEl = document.getElementById('student-welcome-name');
  if (welcomeEl) {
    welcomeEl.innerText = `${user.studentId ? user.studentId.name : user.username} (${user.studentId ? user.studentId.rollNumber : 'ST'})`;
  }

  // Load specific page logic based on DOM elements
  if (document.getElementById('stat-sgpa')) {
    loadDashboardData();
  } else if (document.getElementById('profile-name')) {
    loadProfileData();
  } else if (document.getElementById('memo-card-container')) {
    loadResultDetailData();
  }
});

// 1. Dashboard page loader
async function loadDashboardData() {
  try {
    // Load student profile
    const profileRes = await fetch(`${API_BASE_URL}/api/student/profile`, { credentials: 'include' });
    const profileResult = await profileRes.json();
    if (profileResult.success) {
      document.getElementById('dashboard-student-name').innerText = `Welcome, ${profileResult.data.name}!`;
    }

    // Load results list
    const resultsRes = await fetch(`${API_BASE_URL}/api/student/results`, { credentials: 'include' });
    const resultsResult = await resultsRes.json();
    if (resultsResult.success) {
      const results = resultsResult.data;
      renderDashboardTable(results);
      calculateDashboardStats(results);
    } else {
      showToast(resultsResult.message || 'Failed to load results.', 'error');
    }
  } catch (err) {
    showToast('Network error loading student dashboard.', 'error');
  }
}

function renderDashboardTable(results) {
  const tbody = document.querySelector('#student-exams-table tbody');
  tbody.innerHTML = '';

  if (results.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No evaluation results published yet.</td></tr>`;
    return;
  }

  results.forEach(resRecord => {
    const tr = document.createElement('tr');
    
    // Check if passed all subjects in this semester
    const overallPass = resRecord.subjects.every(s => s.result === 'PASS');
    const statusText = overallPass ? 'PASS' : 'FAIL';
    const statusColor = overallPass ? 'var(--success)' : 'var(--danger)';

    tr.innerHTML = `
      <td><strong>${resRecord.exam ? resRecord.exam.name : '-'}</strong></td>
      <td>${resRecord.academicYear}</td>
      <td>Semester ${resRecord.semester}</td>
      <td><strong>${resRecord.sgpa.toFixed(2)}</strong></td>
      <td style="color: ${statusColor}; font-weight: bold;">${statusText}</td>
      <td style="text-align: right;">
        <a href="result.html?examId=${resRecord.exam ? resRecord.exam._id : ''}" class="btn btn-primary btn-icon" style="padding: 5px 12px; font-size: 0.85rem;">View Result</a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function calculateDashboardStats(results) {
  if (results.length === 0) {
    document.getElementById('stat-sgpa').innerText = '0.00';
    document.getElementById('stat-cgpa').innerText = '0.00';
    document.getElementById('stat-passed').innerText = '0';
    document.getElementById('stat-failed').innerText = '0';
    return;
  }

  // Latest semester is the first item in sorted list
  const latest = results[0];
  document.getElementById('stat-sgpa').innerText = latest.sgpa.toFixed(2);
  document.getElementById('stat-cgpa').innerText = latest.cgpa.toFixed(2);

  // Compute passed & failed subjects in latest semester
  let passedCount = 0;
  let failedCount = 0;
  latest.subjects.forEach(sub => {
    if (sub.result === 'PASS') passedCount++;
    else failedCount++;
  });

  document.getElementById('stat-passed').innerText = passedCount;
  document.getElementById('stat-failed').innerText = failedCount;
}

// 2. Profile page loader
async function loadProfileData() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/student/profile`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      const st = result.data;
      document.getElementById('profile-name').innerText = st.name;
      document.getElementById('profile-roll').innerText = st.rollNumber;
      document.getElementById('profile-email').innerText = st.email;
      document.getElementById('profile-branch').innerText = st.branch;
      document.getElementById('profile-year-sem').innerText = `${st.year} Year - Sem ${st.semester}`;
      document.getElementById('profile-section').innerText = `Section ${st.section}`;
      document.getElementById('profile-phone').innerText = st.phone || 'N/A';

      // Calculate Batch dynamically from roll number (e.g. 23W61A6121 -> 2023-27)
      let batchStr = 'N/A';
      if (st.rollNumber && st.rollNumber.length >= 2) {
        const startYearShort = parseInt(st.rollNumber.substring(0, 2));
        if (!isNaN(startYearShort)) {
          const startYear = 2000 + startYearShort;
          const endYear = startYear + 4;
          batchStr = `${startYear}-${endYear.toString().substring(2)}`;
        }
      }
      const batchEl = document.getElementById('profile-batch');
      if (batchEl) {
        batchEl.innerText = batchStr;
      }

      // Populate edit fields
      document.getElementById('edit-email').value = st.email;
      document.getElementById('edit-phone').value = st.phone || '';

      // Set initials avatar
      const parts = st.name.split(' ');
      let initials = parts[0][0];
      if (parts.length > 1) initials += parts[1][0];
      document.getElementById('avatar-initials').innerText = initials.toUpperCase();

      registerProfileFormHandlers();
    }
  } catch (err) {
    showToast('Failed to load profile details.', 'error');
  }
}

function registerProfileFormHandlers() {
  const contactForm = document.getElementById('contact-form');
  if (contactForm && !contactForm.dataset.registered) {
    contactForm.dataset.registered = 'true';
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('edit-email').value.trim();
      const phone = document.getElementById('edit-phone').value.trim();

      try {
        const response = await fetch(`${API_BASE_URL}/api/student/profile`, { credentials: 'include', 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone })
        });
        const resJSON = await response.json();
        if (resJSON.success) {
          showToast('Contact details updated successfully!', 'success');
          loadProfileData();
        } else {
          showToast(resJSON.message || 'Failed to update contact details.', 'error');
        }
      } catch (err) {
        showToast('Network error updating profile.', 'error');
      }
    });
  }

  const passwordForm = document.getElementById('password-form');
  if (passwordForm && !passwordForm.dataset.registered) {
    passwordForm.dataset.registered = 'true';
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match!', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/student/profile`, { credentials: 'include', 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const resJSON = await response.json();
        if (resJSON.success) {
          showToast('Password changed successfully!', 'success');
          passwordForm.reset();
        } else {
          showToast(resJSON.message || 'Failed to change password.', 'error');
        }
      } catch (err) {
        showToast('Network error changing password.', 'error');
      }
    });
  }
}

// 3. Result Memo details page loader
async function loadResultDetailData() {
  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');
  if (!examId) {
    showToast('No exam parameters provided.', 'error');
    window.location.href = 'dashboard.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/student/results/${examId}`, { credentials: 'include' });
    const result = await res.json();
    if (result.success) {
      const record = result.data;
      renderResultMemo(record);
      
      // Bind PDF download action
      document.getElementById('btn-download-pdf').onclick = () => {
        window.location.href = `/api/results/${record._id}/pdf`;
      };
    } else {
      showToast(result.message || 'Result record not found.', 'error');
      window.location.href = 'dashboard.html';
    }
  } catch (err) {
    showToast('Failed to load result memo.', 'error');
  }
}

function renderResultMemo(record) {
  const container = document.getElementById('memo-card-container');
  
  let rowsHTML = '';
  let overallPass = true;

  record.subjects.forEach((sub, idx) => {
    const isF = sub.grade === 'F';
    if (isF) overallPass = false;
    
    let gradeBadgeStyle = 'background-color: #e0f2fe; color: #0369a1;'; // Blue for A
    if (['S', 'O'].includes(sub.grade)) gradeBadgeStyle = 'background-color: #fef3c7; color: #b45309;'; // Gold for S/O
    if (['B+', 'B'].includes(sub.grade)) gradeBadgeStyle = 'background-color: #e0e7ff; color: #3730a3;'; // Indigo for B
    if (['C+', 'C', 'D', 'E'].includes(sub.grade)) gradeBadgeStyle = 'background-color: #ecfdf5; color: #047857;'; // Green for C/D
    if (isF) gradeBadgeStyle = 'background-color: #fef2f2; color: #b91c1c;'; // Red for F

    const resultBadgeStyle = isF 
      ? 'background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 4px; font-weight: 700;' 
      : 'background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 4px; font-weight: 700;';

    rowsHTML += `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td><strong>${sub.subjectCode}</strong></td>
        <td>${sub.subjectName}</td>
        <td style="text-align: center; font-weight: 600;">${sub.credits}</td>
        <td style="text-align: center;"><span style="font-size: 0.85rem; font-weight: 800; padding: 3px 10px; border-radius: 4px; ${gradeBadgeStyle}">${sub.grade}</span></td>
        <td style="text-align: center; font-weight: 700;">${sub.gradePoint}</td>
        <td style="text-align: center;"><span style="${resultBadgeStyle}">${sub.result}</span></td>
      </tr>
    `;
  });

  const badgeText = overallPass ? 'PASSED' : 'FAILED';

  const publishedDate = new Date(record.publishedAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  container.innerHTML = `
    <div style="background: #ffffff; border: 2px solid #0e3a95; border-radius: 12px; box-shadow: var(--shadow-xl); overflow: hidden; padding: 0;">
      
      <!-- Top Official College Header -->
      <div style="background: linear-gradient(135deg, #0b2a6b 0%, #0e3a95 100%); color: white; padding: 25px 30px; text-align: center; border-bottom: 4px solid #f59e0b; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap;">
          <img src="../images/logo.jpg" alt="College Logo" style="width: 75px; height: 75px; border-radius: 50%; border: 2px solid #f59e0b; background: white; object-fit: cover;">
          <div style="text-align: center;">
            <h2 style="font-size: 1.5rem; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; margin: 0; font-family: var(--font-primary);">SRI SIVANI COLLEGE OF ENGINEERING</h2>
            <div style="font-size: 0.85rem; font-weight: 700; color: #f59e0b; letter-spacing: 1px; margin-top: 3px; text-transform: uppercase;">(AUTONOMOUS)</div>
            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.85); margin-top: 4px;">Approved by AICTE, New Delhi & Affiliated to JNTUGV, Vizianagaram | Accredited by NAAC</div>
          </div>
        </div>
        <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); display: inline-block; padding: 4px 16px; border-radius: 20px; margin-top: 15px; font-size: 0.8rem; font-weight: 800; letter-spacing: 1.5px; color: #fbbf24; text-transform: uppercase;">
          OFFICIAL ACADEMIC GRADE MEMORANDUM
        </div>
      </div>

      <div style="padding: 30px;">
        
        <!-- Student Metadata Card -->
        <div style="background-color: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px 30px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Student Name:</span>
              <span style="font-size: 0.95rem; color: #0f172a; font-weight: 800; text-transform: uppercase;">${record.student ? record.student.name : '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Roll Number:</span>
              <span style="font-size: 0.95rem; color: #0e3a95; font-weight: 800; font-family: monospace; letter-spacing: 0.5px;">${record.student ? record.student.rollNumber : '-'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Branch / Specialization:</span>
              <span style="font-size: 0.9rem; color: #0f172a; font-weight: 700;">${record.branch}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Year & Section:</span>
              <span style="font-size: 0.9rem; color: #0f172a; font-weight: 700;">Year ${record.year} - Section ${record.section}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 4px;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Evaluated Semester:</span>
              <span style="font-size: 0.9rem; color: #0f172a; font-weight: 700;">Semester ${record.semester}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-bottom: 4px;">
              <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Academic Year:</span>
              <span style="font-size: 0.9rem; color: #0f172a; font-weight: 700;">${record.academicYear}</span>
            </div>
          </div>
        </div>

        <!-- Grade Table -->
        <div style="overflow-x: auto; margin-bottom: 25px; border: 1px solid var(--border); border-radius: 8px;">
          <table style="width: 100%; border-collapse: collapse; background: white; font-size: 0.9rem;">
            <thead>
              <tr style="background-color: #0e3a95; color: white; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px;">
                <th style="padding: 12px; text-align: center; width: 60px;">S.No</th>
                <th style="padding: 12px; text-align: left; width: 130px;">Subject Code</th>
                <th style="padding: 12px; text-align: left;">Subject Name</th>
                <th style="padding: 12px; text-align: center; width: 80px;">Credits</th>
                <th style="padding: 12px; text-align: center; width: 90px;">Grade</th>
                <th style="padding: 12px; text-align: center; width: 100px;">Grade Point</th>
                <th style="padding: 12px; text-align: center; width: 110px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
        </div>

        <!-- Summary & Pass Badge Card -->
        <div style="background: ${overallPass ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'}; border: 1px solid ${overallPass ? '#86efac' : '#fca5a5'}; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
          
          <div style="display: flex; gap: 40px; align-items: center;">
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px; display: block;">Semester SGPA</span>
              <span style="font-size: 1.8rem; font-weight: 800; color: #0e3a95;">${record.sgpa.toFixed(2)}</span>
            </div>
            <div style="width: 1px; height: 40px; background: rgba(0,0,0,0.1);"></div>
            <div>
              <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px; display: block;">Cumulative CGPA</span>
              <span style="font-size: 1.8rem; font-weight: 800; color: #002266;">${record.cgpa.toFixed(2)}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 15px;">
            <div style="background-color: ${overallPass ? '#16a34a' : '#dc2626'}; color: white; font-weight: 800; font-size: 1.2rem; padding: 10px 30px; border-radius: 6px; letter-spacing: 1px; box-shadow: var(--shadow-sm);">
              ${badgeText}
            </div>
          </div>
        </div>

        <!-- Official Signatures & Verification -->
        <div style="margin-top: 35px; padding-top: 20px; border-top: 1px dashed var(--border); display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Date of Issue: <strong style="color: var(--text);">${publishedDate}</strong></div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Document Verification: <strong style="color: #0e3a95;">AUTHENTIC / OFFICIAL RECORD</strong></div>
          </div>

          <div style="text-align: center;">
            <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.4rem; color: #0e3a95; margin-bottom: -4px;">Controller of Examinations</div>
            <div style="font-size: 0.8rem; font-weight: 800; color: #000000;">Controller of Examinations</div>
          </div>
        </div>

      </div>
    </div>
  `;
}
