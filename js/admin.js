// NiconX Learning Hub - Admin Panel Functions
// Copyright 2026 NiconX Learning Hub. All rights reserved.

// Admin credentials (CHANGE THESE AFTER FIRST LOGIN)
const ADMIN_USERNAME = 'niconx_admin';
const ADMIN_PASSWORD = 'NiconX@2026Admin';

// Check if admin is logged in
function checkAdminAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isLoggedIn && !window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html';
    }
}

// Admin login
function adminLogin(event) {
    if (event) event.preventDefault();
    
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const errorDiv = document.getElementById('errorMsg');
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminUsername', username);
        showAdminToast('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        if (errorDiv) {
            errorDiv.textContent = 'Invalid username or password';
            errorDiv.classList.remove('hidden');
        }
        showAdminToast('Invalid credentials', 'error');
    }
}

// Admin logout
function adminLogout() {
    localStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('adminUsername');
    window.location.href = 'login.html';
}

// Show admin toast notification
function showAdminToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 right-4 px-4 py-2 rounded-lg text-white z-50 ${
        type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-primary'
    }`;
    toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-2"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Load dashboard stats
async function loadAdminStats() {
    const { data: content, error: contentError } = await supabaseClient
        .from('content')
        .select('*');
    
    const { data: payments, error: paymentsError } = await supabaseClient
        .from('payment_sessions')
        .select('*');
    
    const { data: users, error: usersError } = await supabaseClient
        .from('users')
        .select('*');
    
    if (!contentError) {
        const totalTopics = content.length;
        const freeTopics = content.filter(c => c.is_free).length;
        const premiumTopics = totalTopics - freeTopics;
        
        document.getElementById('totalTopics').textContent = totalTopics;
        document.getElementById('freeTopics').textContent = freeTopics;
        document.getElementById('premiumTopics').textContent = premiumTopics;
    }
    
    if (!paymentsError && payments) {
        const totalPayments = payments.length;
        const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 20), 0);
        document.getElementById('totalPayments').textContent = totalPayments;
        document.getElementById('totalRevenue').textContent = `KES ${totalRevenue.toLocaleString()}`;
    }
    
    if (!usersError && users) {
        document.getElementById('totalUsers').textContent = users.length;
    }
}

// Load content list for management
async function loadContentList() {
    const container = document.getElementById('contentList');
    if (!container) return;
    
    const filterClass = document.getElementById('filterClass')?.value || '';
    const filterSubject = document.getElementById('filterSubject')?.value || '';
    
    container.innerHTML = '<div class="text-center py-8"><div class="spinner mx-auto"></div><p class="text-gray-500 mt-2">Loading content...</p></div>';
    
    let query = supabaseClient.from('content').select('*');
    if (filterClass) query = query.eq('class_level', filterClass);
    if (filterSubject) query = query.eq('subject', filterSubject);
    query = query.order('class_level').order('subject').order('topic_order');
    
    const { data, error } = await query;
    
    if (error) {
        container.innerHTML = `<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle mr-2"></i> Error loading content</div>`;
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-gray-500"><i class="fas fa-database mr-2"></i> No content found. Click "Add New Content" to get started.</div>`;
        return;
    }
    
    container.innerHTML = data.map(content => `
        <div class="border border-gray-200 rounded-xl p-4 hover:shadow-md transition bg-white">
            <div class="flex justify-between items-start flex-wrap gap-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                        <span class="text-xs font-bold px-2 py-1 rounded-full ${content.class_level === 'grade4' ? 'bg-green-100 text-green-700' : content.class_level === 'grade5' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">
                            ${content.class_level.toUpperCase()}
                        </span>
                        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">${content.subject}</span>
                        ${content.is_free ? '<span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full"><i class="fas fa-gift mr-1"></i>Free</span>' : '<span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"><i class="fas fa-lock mr-1"></i>Premium</span>'}
                        <span class="text-xs text-gray-400">Order: ${content.topic_order || 1}</span>
                    </div>
                    <h3 class="font-bold text-secondary text-lg">${escapeHtml(content.topic)}</h3>
                    <div class="flex gap-4 mt-2 text-sm text-gray-500">
                        <span><i class="far fa-file-alt mr-1"></i> ${content.notes ? content.notes.length : 0} chars</span>
                        <span><i class="fas fa-question-circle mr-1"></i> ${content.questions ? content.questions.length : 0} questions</span>
                        <span><i class="far fa-calendar mr-1"></i> ${new Date(content.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editContent('${content.id}')" class="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteContent('${content.id}')" class="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Delete content
async function deleteContent(id) {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) return;
    
    const { error } = await supabaseClient
        .from('content')
        .delete()
        .eq('id', id);
    
    if (error) {
        showAdminToast('Error deleting content: ' + error.message, 'error');
    } else {
        showAdminToast('Content deleted successfully', 'success');
        loadContentList();
        loadAdminStats();
    }
}

// Edit content (load into form)
async function editContent(id) {
    showAdminToast('Edit feature - please use the form to create new content. For edits, delete and re-add.', 'info');
}

// Load reviews list
async function loadReviewsList() {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    // Get reviews from localStorage (or Supabase later)
    let reviews = JSON.parse(localStorage.getItem('niconx_reviews') || '[]');
    
    if (reviews.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-gray-500"><i class="fas fa-comment-dots mr-2"></i> No reviews yet. Reviews will appear here once submitted.</div>`;
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="border border-gray-200 rounded-xl p-4 bg-white">
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex text-primary mb-2">
                        ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
                    </div>
                    <p class="text-gray-700 mb-2">"${escapeHtml(review.comment)}"</p>
                    <p class="text-sm text-gray-500">— ${escapeHtml(review.name)}</p>
                    <p class="text-xs text-gray-400">${new Date(review.date).toLocaleDateString()}</p>
                </div>
                <div class="flex gap-2">
                    ${!review.approved ? `<button onclick="approveReview('${review.id}')" class="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600"><i class="fas fa-check mr-1"></i> Approve</button>` : '<span class="text-green-600 text-sm"><i class="fas fa-check-circle mr-1"></i> Approved</span>'}
                    <button onclick="deleteReview('${review.id}')" class="text-red-500 hover:text-red-700 p-1"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

// Approve review
function approveReview(id) {
    let reviews = JSON.parse(localStorage.getItem('niconx_reviews') || '[]');
    reviews = reviews.map(r => r.id === id ? { ...r, approved: true } : r);
    localStorage.setItem('niconx_reviews', JSON.stringify(reviews));
    loadReviewsList();
    showAdminToast('Review approved and will appear on homepage', 'success');
}

// Delete review
function deleteReview(id) {
    if (!confirm('Delete this review?')) return;
    let reviews = JSON.parse(localStorage.getItem('niconx_reviews') || '[]');
    reviews = reviews.filter(r => r.id !== id);
    localStorage.setItem('niconx_reviews', JSON.stringify(reviews));
    loadReviewsList();
    showAdminToast('Review deleted', 'success');
}

// Tab switching
function showAdminTab(tab) {
    const addTab = document.getElementById('addContentTab');
    const listTab = document.getElementById('listContentTab');
    const reviewsTab = document.getElementById('reviewsTab');
    const tabAdd = document.getElementById('tabAdd');
    const tabList = document.getElementById('tabList');
    const tabReviews = document.getElementById('tabReviews');
    
    if (tab === 'add') {
        addTab.classList.remove('hidden');
        listTab.classList.add('hidden');
        if (reviewsTab) reviewsTab.classList.add('hidden');
        tabAdd.className = 'flex-1 py-3 font-semibold text-primary border-b-2 border-primary';
        tabList.className = 'flex-1 py-3 font-semibold text-gray-500 hover:text-primary';
        if (tabReviews) tabReviews.className = 'flex-1 py-3 font-semibold text-gray-500 hover:text-primary';
    } else if (tab === 'list') {
        addTab.classList.add('hidden');
        listTab.classList.remove('hidden');
        if (reviewsTab) reviewsTab.classList.add('hidden');
        tabList.className = 'flex-1 py-3 font-semibold text-primary border-b-2 border-primary';
        tabAdd.className = 'flex-1 py-3 font-semibold text-gray-500 hover:text-primary';
        if (tabReviews) tabReviews.className = 'flex-1 py-3 font-semibold text-gray-500 hover:text-primary';
        loadContentList();
        loadAdminStats();
    } else if (tab === 'reviews') {
        addTab.classList.add('hidden');
        listTab.classList.add('hidden');
        if (reviewsTab) reviewsTab.classList.remove('hidden');
        tabReviews.className = 'flex-1 py-3 font-semibold text-primary border-b-2 border-primary';
        tabAdd.className = 'flex-1 py-3 font-semibold text-gray-500 hover:text-primary';
        tabList.className = 'flex-1 py-3 font-semibold text-gray-500 hover:text-primary';
        loadReviewsList();
    }
}

// Run admin initialization
if (document.getElementById('adminDashboard')) {
    checkAdminAuth();
    loadAdminStats();
}
