// Global utility functions
function showToast(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
        type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Check if user has active session
async function hasActiveSession(phone, classLevel) {
    try {
        const response = await fetch('/api/verify-access.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, class_level: classLevel })
        });
        const data = await response.json();
        return data.hasAccess;
    } catch {
        return false;
    }
}

// Format phone number for display
function formatPhone(phone) {
    if (phone.startsWith('254')) {
        return '0' + phone.slice(3);
    }
    return phone;
}