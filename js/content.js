// Load dashboard with subjects and topics
async function checkAccessAndLoadDashboard() {
    const phone = localStorage.getItem('userPhone');
    const selectedClass = localStorage.getItem('selectedClass');
    const isFreeTrial = new URLSearchParams(window.location.search).get('free') === 'true';
    
    document.getElementById('classDisplay').innerHTML = selectedClass.toUpperCase().replace('GRADE', 'Grade ');
    
    // If not free trial, verify payment
    if (!isFreeTrial && phone) {
        const verifyResponse = await fetch('/api/verify-access.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, class_level: selectedClass })
        });
        const verifyData = await verifyResponse.json();
        
        if (!verifyData.hasAccess) {
            alert('Your access has expired. Please pay again.');
            window.location.href = 'payment.html';
            return;
        }
        
        // Update expiry time
        localStorage.setItem('sessionExpires', verifyData.expires_at);
    } else if (isFreeTrial) {
        document.getElementById('freeTrialNote').classList.remove('hidden');
    } else if (!phone && !isFreeTrial) {
        window.location.href = 'payment.html';
        return;
    }
    
    // Load content
    await loadSubjectsAndTopics(selectedClass, isFreeTrial);
}

async function loadSubjectsAndTopics(className, isFreeTrial) {
    const response = await fetch(`/api/get-content.php?class=${className}&free=${isFreeTrial}`);
    const data = await response.json();
    
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';
    
    for (const subject of data.subjects) {
        const subjectCard = document.createElement('div');
        subjectCard.className = 'bg-white rounded-xl shadow-md overflow-hidden';
        
        subjectCard.innerHTML = `
            <div class="bg-secondary text-white p-4">
                <h2 class="text-xl font-bold"><i class="fas ${getSubjectIcon(subject.name)} mr-2"></i> ${subject.name}</h2>
            </div>
            <div class="p-4">
                <div class="space-y-2">
                    ${subject.topics.map(topic => `
                        <div class="border rounded-lg p-3 hover:bg-gray-50">
                            <div class="flex justify-between items-center">
                                <div>
                                    <h3 class="font-semibold">${topic.title}</h3>
                                    ${topic.isLocked ? '<p class="text-xs text-red-500"><i class="fas fa-lock"></i> Premium content</p>' : ''}
                                </div>
                                <button onclick="openTopic('${className}', '${subject.name}', '${topic.id}', ${topic.isLocked})" 
                                        class="bg-primary text-white px-4 py-1 rounded-lg text-sm">
                                    ${topic.isLocked ? 'Unlock' : 'Study'}
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        container.appendChild(subjectCard);
    }
}

function getSubjectIcon(subject) {
    const icons = {
        'Mathematics': 'fa-calculator',
        'English': 'fa-book',
        'Science': 'fa-flask',
        'Social Studies': 'fa-globe'
    };
    return icons[subject] || 'fa-graduation-cap';
}

function openTopic(className, subject, topicId, isLocked) {
    if (isLocked) {
        if (confirm('This is a premium topic. Pay 20 KES to unlock all topics for 8 hours?')) {
            window.location.href = 'payment.html';
        }
        return;
    }
    window.location.href = `view-content.html?class=${className}&subject=${subject}&topic=${topicId}`;
}