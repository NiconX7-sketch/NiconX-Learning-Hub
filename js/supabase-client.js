// NiconX Learning Hub - Supabase Client Configuration
// Copyright 2026 NiconX Learning Hub. All rights reserved.

// Supabase Configuration - REPLACE WITH YOUR ACTUAL KEYS
const SUPABASE_URL = 'https://pqzxjqokyaxdxqilbaoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxenhqcW9reWF4ZHhxaWxiYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Mjc1ODksImV4cCI6MjA5NTAwMzU4OX0.7tYky-gjsrHLDkOt68diB1CjmSnI92tpNgjg505nNdM';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function: Check if user has active access
async function checkUserAccess(phone, classLevel) {
    try {
        const { data, error } = await supabaseClient
            .rpc('check_user_access', {
                p_phone: phone,
                p_class_level: classLevel
            });
        
        if (error) {
            console.error('Access check error:', error);
            return { has_access: false };
        }
        
        return data && data[0] ? data[0] : { has_access: false };
    } catch (err) {
        console.error('Access check exception:', err);
        return { has_access: false };
    }
}

// Helper function: Create payment session after successful payment
async function createPaymentSession(phone, classLevel, mpesaReceipt, amount = 20) {
    try {
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
            return { success: false, error: error.message };
        }
        
        return { success: true, expiresAt: expiresAt.toISOString() };
    } catch (err) {
        console.error('Session creation exception:', err);
        return { success: false, error: err.message };
    }
}

// Helper function: Get all content for a specific class
async function getClassContent(classLevel) {
    try {
        const { data, error } = await supabaseClient
            .from('content')
            .select('*')
            .eq('class_level', classLevel)
            .order('subject', { ascending: true })
            .order('topic_order', { ascending: true });
        
        if (error) {
            console.error('Content fetch error:', error);
            return { success: false, error: error.message, data: [] };
        }
        
        return { success: true, data: data };
    } catch (err) {
        console.error('Content fetch exception:', err);
        return { success: false, error: err.message, data: [] };
    }
}

// Helper function: Get single topic by ID
async function getTopicById(topicId) {
    try {
        const { data, error } = await supabaseClient
            .from('content')
            .select('*')
            .eq('id', topicId)
            .single();
        
        if (error) {
            console.error('Topic fetch error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, data: data };
    } catch (err) {
        console.error('Topic fetch exception:', err);
        return { success: false, error: err.message };
    }
}

// Helper function: Save learner progress
async function saveProgress(phone, contentId, questionId, isCorrect, userAnswer) {
    try {
        const { data, error } = await supabaseClient
            .from('learner_progress')
            .insert([{
                phone: phone,
                content_id: contentId,
                question_id: questionId,
                is_correct: isCorrect,
                user_answer: userAnswer
            }]);
        
        if (error) {
            console.error('Progress save error:', error);
            return { success: false };
        }
        
        return { success: true };
    } catch (err) {
        console.error('Progress save exception:', err);
        return { success: false };
    }
}

// Helper function: Get user's payment history
async function getUserPaymentHistory(phone) {
    try {
        const { data, error } = await supabaseClient
            .from('payment_sessions')
            .select('*')
            .eq('phone', phone)
            .order('paid_at', { ascending: false });
        
        if (error) {
            console.error('Payment history error:', error);
            return { success: false, data: [] };
        }
        
        return { success: true, data: data };
    } catch (err) {
        console.error('Payment history exception:', err);
        return { success: false, data: [] };
    }
}
