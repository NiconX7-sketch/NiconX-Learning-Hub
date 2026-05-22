// NiconX Learning Hub - Content Management
// Copyright 2026 NiconX Learning Hub. All rights reserved.

// Global variables
let currentTopics = [];
let currentSubject = '';

// Load dashboard with subjects and topics
async function verifyAndLoadDashboard() {
    const selectedClass = localStorage.getItem('selectedClass');
    const userPhone = localStorage.getItem('userPhone');
    const isFreeTrial = new URLSearchParams(window.location.search).get('free') === 'true';
    
    // Display class name
    const classDisplay = document.getElementById('classDisplay');
    if (classDisplay) {
        classDisplay.innerHTML = (selectedClass || 'Grade').toUpperCase().replace('GRADE', 'Grade ');
    }
    
    // Check access if not free trial
    if (!isFreeTrial && userPhone) {
        const access = await checkUserAccess(userPhone, selectedClass);
        if (!access.has_access) {
            showToast('Your access has expired. Please pay 20 KES to continue.', 'error');
            setTimeout(() => {
                window.location.href = 'payment.html';
            }, 2000);
            return false;
        }
        
        // Update timer
        if (access.expires_at) {
            localStorage.setItem('sessionExpires', access.expires_at);
            startExpiryTimer(access.expires_at);
        }
    } else if (isFreeTrial) {
        const freeTrialNote = document.getElementById('freeTrialNote');
        if (freeTrialNote) freeTrialNote.classList.remove('hidden');
    } else if (!userPhone && !isFreeTrial) {
        window.location.href = 'payment.html';
        return false;
    }
    
    // Load content
    await loadClassContent(selectedClass, isFreeTrial);
    return true;
}

// Load content from Supabase
async function loadClassContent(className, isFreeTrial) {
    const container = document.getElementById('subjectsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="col-span-2 text-center py-12"><div class="spinner mx-auto"></div><p class="text-gray-500 mt-4">Loading your topics...</p></div>';
    
    const result = await getClassContent(className);
    
    if (!result.success || result.data.length === 0) {
        container.innerHTML = `
            <div class="col-span-2 text-center py-12">
                <i class="fas fa-book-open text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No content available yet for this class.</p>
                <p class="text-sm text-gray-400 mt-2">Check back soon! New topics added weekly.</p>
            </div>
        `;
        return;
    }
    
    // Group content by subject
    const subjectsMap = new Map();
    result.data.forEach(item => {
        if (!subjectsMap.has(item.subject)) {
            subjectsMap.set(item.subject, []);
        }
        subjectsMap.get(item.subject).push({
            id: item.id,
            title: item.topic,
            topic_order: item.topic_order,
            isLocked: !isFreeTrial && !item.is_free,
            is_free: item.is_free,
            notes: item.notes,
            questions: item.questions
        });
    });
    
    // Sort topics within each subject by topic_order
    for (let [subject, topics] of subjectsMap.entries()) {
        topics.sort((a, b) => a.topic_order - b.topic_order);
        subjectsMap.set(subject, topics);
    }
    
    // Render subjects
    renderSubjectsGrid(subjectsMap);
}

// Render subjects grid
function renderSubjectsGrid(subjectsMap) {
    const container = document.getElementById('subjectsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let [subjectName, topics] of subjectsMap.entries()) {
        const subjectCard = document.createElement('div');
        subjectCard.className = 'bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300';
        
        // Count topics
        const freeCount = topics.filter(t => t.is_free).length;
        const lockedCount = topics.filter(t => t.isLocked).length;
        
        subjectCard.innerHTML = `
            <div class="bg-secondary text-white px-5 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas ${getSubjectIcon(subjectName)} text-xl mr-3"></i>
                        <h2 class="text-xl font-bold">${escapeHtml(subjectName)}</h2>
                    </div>
                    <div class="text-xs bg-white/20 px-2 py-1 rounded-full">
                        ${freeCount} free • ${lockedCount} premium
                    </div>
                </div>
            </div>
            <div class="p-4 divide-y divide-gray-100">
                ${topics.map(topic => `
                    <div class="py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded-lg transition">
                        <div class="flex-1">
                            <h3 class="font-semibold text-gray-800">${escapeHtml(topic.title)}</h3>
                            <div class="flex items-center mt-1">
                                ${topic.isLocked ? 
                                    '<span class="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full"><i class="fas fa-lock mr-1"></i> Premium</span>' : 
                                    '<span class="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full"><i class="fas fa-unlock-alt mr-1"></i> Free</span>'
                                }
                                ${topic.is_free ? '<span class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full ml-2"><i class="fas fa-gift mr-1"></i> Trial</span>' : ''}
                            </div>
                        </div>
                        <button onclick="openTopic('${topic.id}', ${topic.isLocked})" 
                                class="bg-primary hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition ml-3">
                            ${topic.isLocked ? '<i class="fas fa-lock mr-1"></i> Unlock' : '<i class="fas fa-play mr-1"></i> Study'}
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(subjectCard);
    }
}

// Open a topic
async function openTopic(topicId, isLocked) {
    const isFreeTrial = new URLSearchParams(window.location.search).get('free') === 'true';
    const userPhone = localStorage.getItem('userPhone');
    
    if (isLocked && !isFreeTrial) {
        if (confirm('This is a premium topic. Pay 20 KES to unlock ALL topics for 8 hours?')) {
            window.location.href = 'payment.html';
        }
        return;
    }
    
    // Store topic ID and redirect
    localStorage.setItem('currentTopicId', topicId);
    window.location.href = `view-content.html?topic=${topicId}`;
}

// Start expiry timer in header
function startExpiryTimer(expiresAt) {
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;
    
    const updateTimer = () => {
        const formatted = formatTimeRemaining(expiresAt);
        if (formatted === 'Expired') {
            timerDisplay.innerHTML = '<span class="text-red-500"><i class="fas fa-clock mr-1"></i> Access expired. <a href="payment.html" class="underline">Pay again</a></span>';
        } else {
            timerDisplay.innerHTML = `<i class="fas fa-hourglass-half mr-1 text-primary"></i> Access expires in: <strong>${formatted}</strong>`;
        }
    };
    
    updateTimer();
    const interval = setInterval(() => {
        const formatted = formatTimeRemaining(expiresAt);
        if (formatted === 'Expired') {
            clearInterval(interval);
            updateTimer();
        } else {
            updateTimer();
        }
    }, 1000);
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout? Your access will remain active until expiry.')) {
        localStorage.removeItem('userPhone');
        localStorage.removeItem('selectedClass');
        localStorage.removeItem('sessionExpires');
        localStorage.removeItem('currentTopicId');
        window.location.href = 'index.html';
    }
}

// Initialize dashboard
if (document.getElementById('subjectsContainer')) {
    verifyAndLoadDashboard();
}
