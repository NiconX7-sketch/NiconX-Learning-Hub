// Payment handling with M-Pesa STK Push
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value;
    const selectedClass = localStorage.getItem('selectedClass');
    const payBtn = document.getElementById('payBtn');
    const statusDiv = document.getElementById('paymentStatus');
    
    // Validate phone number
    if (!phone.match(/^07[0-9]{8}$/)) {
        showStatus('Please enter a valid Safaricom phone number (07XXXXXXXX)', 'error');
        return;
    }
    
    // Disable button during processing
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
    
    try {
        // Step 1: Initiate STK Push
        const initResponse = await fetch('/api/stk-push.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: phone,
                amount: 20,
                class_level: selectedClass
            })
        });
        
        const initData = await initResponse.json();
        
        if (!initData.success) {
            throw new Error(initData.message || 'Payment initiation failed');
        }
        
        showStatus('✓ M-Pesa prompt sent to your phone. Enter PIN to complete payment.', 'success');
        
        // Step 2: Poll for payment confirmation
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds
        const checkInterval = setInterval(async () => {
            attempts++;
            
            const checkResponse = await fetch('/api/check-payment.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone,
                    class_level: selectedClass
                })
            });
            
            const checkData = await checkResponse.json();
            
            if (checkData.success && checkData.paid) {
                clearInterval(checkInterval);
                // Save session info
                localStorage.setItem('paymentVerified', 'true');
                localStorage.setItem('userPhone', phone);
                localStorage.setItem('sessionExpires', checkData.expires_at);
                
                showStatus('✓ Payment successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                showStatus('Payment confirmation timed out. If you paid, please contact support.', 'error');
                payBtn.disabled = false;
                payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
            }
        }, 2000);
        
    } catch (error) {
        showStatus(error.message, 'error');
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fas fa-money-bill-wave mr-2"></i> Pay 20 KES via M-Pesa';
    }
});

function showStatus(message, type) {
    const statusDiv = document.getElementById('paymentStatus');
    statusDiv.className = `mt-4 p-3 rounded-lg ${type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`;
    statusDiv.innerHTML = message;
    statusDiv.classList.remove('hidden');
}