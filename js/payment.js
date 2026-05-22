// NiconX Learning Hub - Payment Processing
// Copyright 2026 NiconX Learning Hub. All rights reserved.

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
    
    // Validate phone number (Kenyan format)
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
        // Call IntaSend API to initiate STK Push
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
            showPaymentStatus('✓ STK Push sent to ' + formatPhoneNumber(phone) + '. Enter your M-Pesa PIN to complete payment.', 'success');
            
            // Poll for payment confirmation
            let attempts = 0;
            const maxAttempts = 30; // 60 seconds total (2 second intervals)
            
            const checkInterval = setInterval(async () => {
                attempts++;
                
                // Check if payment session was created in Supabase
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
                    showPaymentStatus('✓ Payment successful! Redirecting to dashboard...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    showPaymentStatus('Waiting for confirmation. If you completed payment, your access will be activated within 5 minutes. Contact support if issues persist.', 'info');
                    payBtn.disabled = false;
                    payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
                }
            }, 2000);
            
        } else {
            showPaymentStatus('Error: ' + (result.message || 'Payment initiation failed. Please try again.'), 'error');
            payBtn.disabled = false;
            payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        showPaymentStatus('Network error. Please check your internet connection and try again.', 'error');
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
    }
});

// Helper function for payment status display
function showPaymentStatus(message, type) {
    const statusDiv = document.getElementById('paymentStatus');
    const bgColor = type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 
                   (type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 
                   'bg-blue-100 text-blue-700 border border-blue-200');
    statusDiv.className = `mt-4 p-4 rounded-xl ${bgColor}`;
    statusDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i> ${message}`;
    statusDiv.classList.remove('hidden');
    
    // Auto-hide after 8 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 8000);
    }
}

// Check if user already has an active session
async function checkExistingSession() {
    const phone = localStorage.getItem('userPhone');
    if (phone && selectedClass) {
        const access = await checkUserAccess(phone, selectedClass);
        if (access.has_access) {
            showPaymentStatus('You already have an active session! Redirecting to dashboard...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        }
    }
}

// Run check on page load
if (selectedClass) {
    checkExistingSession();
} else {
    window.location.href = 'select-class.html';
}
