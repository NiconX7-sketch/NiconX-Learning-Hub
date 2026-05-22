// NiconX Learning Hub - Main JavaScript
// Copyright 2026 NiconX Learning Hub. All rights reserved.

// Global utility functions

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed bottom-20 right-4 px-5 py-3 rounded-xl text-white z-50 shadow-lg transition-all duration-300 ${
        type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-primary'
    }`;
    toast.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-2"></i> ${message}`;
    toast.style.transform = 'translateX(400px)';
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Format phone number for display
function formatPhoneNumber(phone) {
    if (!phone) return '';
    if (phone.startsWith('254')) {
        return '0' + phone.slice(3);
    }
    return phone;
}

// Validate phone number (Kenyan)
function validatePhoneNumber(phone) {
    const phoneRegex = /^(07|01|2547|2541)\d{8}$/;
    return phoneRegex.test(phone);
}

// Format time remaining
function formatTimeRemaining(expiresAt) {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const timeLeft = expiry - now;
    
    if (timeLeft <= 0) {
        return 'Expired';
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (3600000)) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

// Get subject icon (professional Font Awesome icons only)
function getSubjectIcon(subject) {
    const icons = {
        'Mathematics': 'fa-chart-line',
        'English': 'fa-book-open',
        'Science': 'fa-microscope',
        'Social Studies': 'fa-landmark',
        'Kiswahili': 'fa-language',
        'Religious Education': 'fa-church',
        'Creative Arts': 'fa-palette',
        'Physical Education': 'fa-running'
    };
    return icons[subject] || 'fa-graduation-cap';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get URL parameters
function getUrlParams() {
    const params = {};
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    for (const [key, value] of urlParams.entries()) {
        params[key] = value;
    }
    return params;
}

// Redirect with message
function redirectWithMessage(url, message, type = 'info') {
    if (message) {
        sessionStorage.setItem('toastMessage', message);
        sessionStorage.setItem('toastType', type);
    }
    window.location.href = url;
}

// Check for stored toast message on page load
function checkStoredToast() {
    const message = sessionStorage.getItem('toastMessage');
    const type = sessionStorage.getItem('toastType');
    if (message) {
        showToast(message, type);
        sessionStorage.removeItem('toastMessage');
        sessionStorage.removeItem('toastType');
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', function() {
    checkStoredToast();
    
    // Add active class to current nav link
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('text-primary');
            link.classList.remove('text-secondary');
        }
    });
});

// Disable right-click on content pages (simple protection)
if (window.location.pathname.includes('view-content.html')) {
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable common shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'PrintScreen' || 
            (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u' || e.key === 'c'))) {
            e.preventDefault();
            showToast('Screenshots and saving are disabled to protect content.', 'error');
            return false;
        }
    });
}
