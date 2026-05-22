// NiconX Learning Hub - Payment Processing
// Copyright 2026 NiconX Learning Hub. All rights reserved.

// Phone validation function (self-contained to avoid dependency errors)
function validatePhoneNumber(phone) {
    const phoneRegex = /^(07|01|2547|2541)\d{8}$/;
    return phoneRegex.test(phone);
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    if (phone.startsWith('254')) {
        return '0' + phone.slice(3);
    }
    return phone;
}

// Get selected class from localStorage
const selectedClass = localStorage.getItem('selectedClass');

// Payment form handler
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phoneInput = document.getElementById('phone');
    const phone = phoneInput.value.trim();
    const email = document.getElementById('email').value.trim();
    const payBtn = document.getElementById('payBtn');
    const statusDiv = document.getElementById('paymentStatus');
    
    // Validate phone
    if (!validatePhoneNumber(phone)) {
        showPaymentStatus('Please enter a valid Safaricom phone number (e.g., 0712345678)', 'error');
        return;
    }
    
    // Store phone for later use
    localStorage.setItem('userPhone', phone);
    
    // Disable button during processing
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-pulse mr-2"></i> Sending STK Push...';
    
    try {
        // Call IntaSend API
        const response = await fetch('/api/intasend-stk.php', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                phone: phone,
                email: email || 'student@niconxlearning.co.ke',
                amount: 20,
                class_level: selectedClass
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showPaymentStatus('✓ STK Push sent to ' + formatPhoneNumber(phone) + '. Enter your M-Pesa PIN.', 'success');
            
            // Poll for payment confirmation
            let attempts = 0;
            const maxAttempts = 30;
            
            const checkInterval = setInterval(async () => {
                attempts++;
                
                // Check if payment session exists in Supabase
                if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                    const { data, error } = await supabaseClient
                        .from('payment_sessions')
                        .select('*')
                        .eq('phone', phone)
                        .eq('class_level', selectedClass)
                        .order('paid_at', { ascending: false })
                        .limit(1);
                    
                    if (data && data.length > 0 && data[0].status === 'active') {
                        clearInterval(checkInterval);
                        localStorage.setItem('sessionExpires', data[0].expires_at);
                        showPaymentStatus('✓ Payment successful! Redirecting...', 'success');
                        setTimeout(() => {
                            window.location.href = 'dashboard.html';
                        }, 2000);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        showPaymentStatus('Payment pending. If you paid, access will activate shortly.', 'info');
                        payBtn.disabled = false;
                        payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    showPaymentStatus('Check your phone for STK Push. Access will activate after payment.', 'info');
                    payBtn.disabled = false;
                    payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
                }
            }, 2000);
            
        } else {
            showPaymentStatus('Error: ' + (result.message || 'Payment failed. Try again.'), 'error');
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        showPaymentStatus('Network error. Please try again.', 'error');
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
    }
});

function showPaymentStatus(message, type) {
    const statusDiv = document.getElementById('paymentStatus');
    if (!statusDiv) return;
    
    const bgColor = type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 
                   (type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 
                   'bg-blue-100 text-blue-700 border border-blue-200');
    statusDiv.className = `mt-4 p-4 rounded-xl ${bgColor}`;
    statusDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i> ${message}`;
    statusDiv.classList.remove('hidden');
    
    if (type !== 'error') {
        setTimeout(() => {
            if (statusDiv) statusDiv.classList.add('hidden');
        }, 8000);
    }
}

// Check if user already has active session
async function checkExistingSession() {
    const phone = localStorage.getItem('userPhone');
    if (phone && selectedClass && selectedClass !== 'null' && typeof supabaseClient !== 'undefined') {
        try {
            const { data, error } = await supabaseClient
                .from('payment_sessions')
                .select('*')
                .eq('phone', phone)
                .eq('class_level', selectedClass)
                .eq('status', 'active')
                .gt('expires_at', new Date().toISOString())
                .limit(1);
            
            if (data && data.length > 0) {
                showPaymentStatus('You have an active session! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            }
        } catch(e) {
            console.log('Session check skipped');
        }
    }
}

// Run on page load
if (selectedClass && selectedClass !== 'null') {
    checkExistingSession();
} else if (!selectedClass || selectedClass === 'null') {
    window.location.href = 'select-class.html';
}
