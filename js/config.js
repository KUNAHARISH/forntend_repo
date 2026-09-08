// Central API Base URL Configuration
// In development, defaults to http://localhost:5000
// In production (GitHub Pages/Vercel), replace with your live backend URL (e.g. https://your-backend.onrender.com)
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://exam-result-backend.onrender.com';
