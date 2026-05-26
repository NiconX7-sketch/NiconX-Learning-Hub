// NiconX Learning Hub - Supabase Client Configuration
// Copyright 2026 NiconX Learning Hub. All rights reserved.

// Supabase Configuration - REPLACE WITH YOUR ACTUAL KEYS
const SUPABASE_URL = 'https://pqzxjqokyaxdxqilbaoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxenhqcW9reWF4ZHhxaWxiYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Mjc1ODksImV4cCI6MjA5NTAwMzU4OX0.7tYky-gjsrHLDkOt68diB1CjmSnI92tpNgjg505nNdM';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// USER & AUTH FUNCTIONS
// ============================================

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

// ============================================
// CONTENT FUNCTIONS
// ============================================

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

// Helper function: Get all subjects for a class
async function getClassSubjects(classLevel) {
    try {
        const { data, error } = await supabaseClient
            .from('content')
            .select('subject')
            .eq('class_level', classLevel)
            .order('subject', { ascending: true });
        
        if (error) {
            console.error('Subjects fetch error:', error);
            return { success: false, data: [] };
        }
        
        // Get unique subjects
        const uniqueSubjects = [...new Map(data.map(item => [item.subject, item])).values()];
        return { success: true, data: uniqueSubjects };
    } catch (err) {
        console.error('Subjects fetch exception:', err);
        return { success: false, data: [] };
    }
}

// Helper function: Get topics for a specific subject
async function getSubjectTopics(classLevel, subject) {
    try {
        const { data, error } = await supabaseClient
            .from('content')
            .select('*')
            .eq('class_level', classLevel)
            .eq('subject', subject)
            .order('topic_order', { ascending: true });
        
        if (error) {
            console.error('Topics fetch error:', error);
            return { success: false, data: [] };
        }
        
        return { success: true, data: data };
    } catch (err) {
        console.error('Topics fetch exception:', err);
        return { success: false, data: [] };
    }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

// Helper function: Add new content
async function addContent(contentData) {
    try {
        const { data, error } = await supabaseClient
            .from('content')
            .insert([{
                class_level: contentData.class_level,
                subject: contentData.subject,
                topic: contentData.topic,
                topic_order: contentData.topic_order || 1,
                notes: contentData.notes,
                questions: contentData.questions || [],
                images: contentData.images || [],
                is_free: contentData.is_free || false,
                created_at: new Date().toISOString()
            }]);
        
        if (error) {
            console.error('Add content error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, data: data };
    } catch (err) {
        console.error('Add content exception:', err);
        return { success: false, error: err.message };
    }
}

// Helper function: Update existing content
async function updateContent(contentId, contentData) {
    try {
        const { data, error } = await supabaseClient
            .from('content')
            .update({
                class_level: contentData.class_level,
                subject: contentData.subject,
                topic: contentData.topic,
                topic_order: contentData.topic_order,
                notes: contentData.notes,
                questions: contentData.questions,
                images: contentData.images,
                is_free: contentData.is_free,
                updated_at: new Date().toISOString()
            })
            .eq('id', contentId);
        
        if (error) {
            console.error('Update content error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true, data: data };
    } catch (err) {
        console.error('Update content exception:', err);
        return { success: false, error: err.message };
    }
}

// Helper function: Delete content
async function deleteContent(contentId) {
    try {
        const { error } = await supabaseClient
            .from('content')
            .delete()
            .eq('id', contentId);
        
        if (error) {
            console.error('Delete content error:', error);
            return { success: false, error: error.message };
        }
        
        return { success: true };
    } catch (err) {
        console.error('Delete content exception:', err);
        return { success: false, error: err.message };
    }
}

// ============================================
// PROGRESS FUNCTIONS
// ============================================

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
                user_answer: userAnswer,
                answered_at: new Date().toISOString()
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

// Helper function: Get user's progress for a topic
async function getUserProgress(phone, contentId) {
    try {
        const { data, error } = await supabaseClient
            .from('learner_progress')
            .select('*')
            .eq('phone', phone)
            .eq('content_id', contentId);
        
        if (error) {
            console.error('Progress fetch error:', error);
            return { success: false, data: [] };
        }
        
        return { success: true, data: data };
    } catch (err) {
        console.error('Progress fetch exception:', err);
        return { success: false, data: [] };
    }
}

// ============================================
// PAYMENT FUNCTIONS
// ============================================

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

// Helper function: Check active payment session
async function getActiveSession(phone, classLevel) {
    try {
        const { data, error } = await supabaseClient
            .from('payment_sessions')
            .select('*')
            .eq('phone', phone)
            .eq('class_level', classLevel)
            .eq('status', 'active')
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('Active session error:', error);
            return { success: false, data: null };
        }
        
        return { success: true, data: data && data.length > 0 ? data[0] : null };
    } catch (err) {
        console.error('Active session exception:', err);
        return { success: false, data: null };
    }
}

// ============================================
// STATS FUNCTIONS FOR ADMIN
// ============================================

// Helper function: Get total counts for admin dashboard
async function getAdminStats() {
    try {
        // Get total content count
        const { count: totalContent, error: contentError } = await supabaseClient
            .from('content')
            .select('*', { count: 'exact', head: true });
        
        // Get total payment sessions
        const { count: totalPayments, error: paymentsError } = await supabaseClient
            .from('payment_sessions')
            .select('*', { count: 'exact', head: true });
        
        // Get total users
        const { count: totalUsers, error: usersError } = await supabaseClient
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        // Get free vs premium content
        const { data: contentData, error: contentDataError } = await supabaseClient
            .from('content')
            .select('is_free');
        
        let freeTopics = 0;
        let premiumTopics = 0;
        if (contentData) {
            freeTopics = contentData.filter(c => c.is_free === true).length;
            premiumTopics = contentData.filter(c => c.is_free === false).length;
        }
        
        return {
            success: true,
            stats: {
                totalTopics: totalContent || 0,
                freeTopics: freeTopics,
                premiumTopics: premiumTopics,
                totalPayments: totalPayments || 0,
                totalUsers: totalUsers || 0
            }
        };
    } catch (err) {
        console.error('Admin stats error:', err);
        return { success: false, stats: null };
    }
}
