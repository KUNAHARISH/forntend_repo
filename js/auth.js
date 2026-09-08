/**
 * Global authentication guards and toast notification scripts
 */

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Custom Icon based on type
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';
  if (type === 'warning') icon = '⚠';

  toast.innerHTML = `
    <span style="font-weight: bold; font-size: 1.1rem; color: inherit;">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto-remove toast after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 4000);
}

// Client-side authentication guard
async function checkAuth(requiredRole) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
    const status = await response.json();

    if (!status.authenticated) {
      // Not logged in
      const loginRedirect = requiredRole === 'admin' ? '/admin-login.html' : '/student-login.html';
      window.location.href = loginRedirect;
      return null;
    }

    if (status.user.role !== requiredRole) {
      // Authenticated but incorrect role
      const redirectPage = status.user.role === 'admin' ? '/admin/dashboard.html' : '/student/dashboard.html';
      window.location.href = redirectPage;
      return null;
    }

    return status.user;
  } catch (err) {
    console.error('Session guard check failed:', err);
    window.location.href = '/index.html';
    return null;
  }
}

// Logout session trigger
async function handleLogout(redirectUrl = '/index.html') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, { credentials: 'include', 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    if (result.success) {
      window.location.href = redirectUrl;
    } else {
      showToast('Logout failed. Please try again.', 'error');
    }
  } catch (err) {
    showToast('Network error logging out.', 'error');
  }
}
