# Exam Result Management System - Frontend

This repository contains the static frontend files (HTML, CSS, JavaScript, Images) for the College Exam Result Management System.

## 🚀 How to Run Locally

1. Simply open `index.html` in your browser, or use a live server extension (e.g. VS Code Live Server / `npx serve .`).
2. Make sure the backend server is running locally on `http://localhost:5000`.

## 🌐 How to Deploy to GitHub Pages

1. **Create a GitHub Repository**:
   - Go to GitHub -> **New Repository** -> Name it `exam-result-frontend`.
2. **Push Code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial frontend commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/exam-result-frontend.git
   git push -u origin main
   ```
3. **Enable GitHub Pages**:
   - Go to your repository on GitHub -> **Settings** -> **Pages**.
   - Under **Source**, select `main` branch and folder `/ (root)`.
   - Click **Save**. Your site will be published at: `https://YOUR_USERNAME.github.io/exam-result-frontend/`.

4. **Connect to Deployed Backend**:
   - Open `js/config.js` and set your deployed backend URL:
     ```javascript
     const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
       ? 'http://localhost:5000'
       : 'https://your-backend-app.onrender.com'; // Replace with your live Render backend URL
     ```
   - Commit and push the changes:
     ```bash
     git add js/config.js
     git commit -m "Update live backend API URL"
     git push
     ```
