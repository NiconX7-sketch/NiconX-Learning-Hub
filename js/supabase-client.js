// Supabase Configuration
const SUPABASE_URL = 'https://pqzxjqokyaxdxqilbaoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxenhqcW9reWF4ZHhxaWxiYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Mjc1ODksImV4cCI6MjA5NTAwMzU4OX0.7tYky-gjsrHLDkOt68diB1CjmSnI92tpNgjg505nNdM';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to check if user has active access
async function checkUserAccess(phone, classLevel) {
    const { data, error } = await supabaseClient
        .rpc('check_user_access', {
            p_phone: phone,
            p_class_level: classLevel
        });
    
    if (error) {
        console.error('Access check error:', error);
        return { hasAccess: false };
    }
    
    return data && data[0] ? data[0] : { hasAccess: false };
}

// Helper function to create payment session after successful payment
async function createPaymentSession(phone, classLevel, mpesaReceipt, amount = 20) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8);
    
    const { data, error } = await supabaseClient
        .from('payment_sessions')
        .insert([{
            phone: phone,
            class_level: classLevel,
            amount: amount,
            mpesa_receipt: mpesaReceipt,
            expires_at: expiresAt.toISOString(),
            status: 'active'
        }]);
    
    if (error) {
        console.error('Session creation error:', error);
        return { success: false, error };
    }
    
    return { success: true, expiresAt };
}
