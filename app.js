// API Configuration
const API_URL = 'https://treeoflife-vn25.onrender.com';
let currentConversationId = null;
let authToken = null;
let backendAwake = false;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    authToken = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');
    
    console.log('Auth check:', { hasToken: !!authToken, email: userEmail });
    
    if (!authToken) {
        console.log('No auth token found, redirecting to login...');
        // Delay redirect slightly so user can see what's happening
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1000);
        return;
    }

    console.log('User is authenticated:', userEmail);

    // Initialize chat
    initializeChat();
    setupEventListeners();
    
    // Wake up backend
    wakeUpBackend();
});

// Wake up backend (Render free tier sleeps)
async function wakeUpBackend() {
    const chatMessages = document.getElementById('chatMessages');
    const wakeMsg = document.createElement('div');
    wakeMsg.id = 'wakeMessage';
    wakeMsg.className = 'message system-message';
    wakeMsg.innerHTML = `
        <div class="message-content">
            <strong>SYSTEM</strong><br>
            Waking up backend server... (This may take 30-60 seconds on first load)
        </div>
    `;
    chatMessages.appendChild(wakeMsg);

    try {
        console.log('Pinging backend to wake it up...');
        const response = await fetch(`${API_URL}/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        console.log('Backend wake response:', response.status);
        
        if (response.ok) {
            backendAwake = true;
            wakeMsg.remove();
            console.log('Backend is awake!');
        } else {
            wakeMsg.innerHTML = `
                <div class="message-content">
                    <strong>SYSTEM</strong><br>
                    Backend responded but may need a moment. You can try sending a message now.
                </div>
            `;
        }
    } catch (error) {
        console.error('Error waking backend:', error);
        wakeMsg.innerHTML = `
            <div class="message-content">
                <strong>SYSTEM</strong><br>
                Backend is waking up. This can take 30-60 seconds on Render free tier.<br>
                Try sending a message in a moment.
            </div>
        `;
    }
}

// Initialize chat interface
function initializeChat() {
    const chatMessages = document.getElementById('chatMessages');
    
    // Add welcome message
    addMessage('assistant', `Welcome to Tree of Life AI! I integrate wisdom from 11 medical traditions:

• Western Medicine
• Ayurveda
• Traditional Chinese Medicine
• Herbal Medicine
• Homeopathy
• Chiropractic
• Clinical Nutrition
• Vibrational Healing
• Fitness & Physical Therapy
• Elder Care & Law
• Consciousness Mapping

How can I help you today?`);
}

// Setup event listeners
function setupEventListeners() {
    const sendButton = document.getElementById('sendButton');
    const userInput = document.getElementById('userInput');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Send message on button click
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Send message on Enter key (but not Shift+Enter)
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('Logging out...');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userEmail');
            window.location.href = 'auth.html';
        });
    }

    // Tradition buttons
    const traditionButtons = document.querySelectorAll('.tradition-btn');
    traditionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tradition = button.getAttribute('data-tradition');
            handleTraditionClick(tradition);
        });
    });

    // Quick action buttons
    setupQuickActions();
}

// Handle tradition button clicks
function handleTraditionClick(tradition) {
    const messages = {
        western: "Tell me about this from a Western Medicine perspective.",
        ayurveda: "What does Ayurveda say about this?",
        tcm: "What's the Traditional Chinese Medicine view?",
        herbal: "What herbal remedies might help?",
        homeopathy: "Are there any homeopathic approaches?",
        chiropractic: "What's the chiropractic perspective?",
        nutrition: "What nutritional approaches might help?",
        vibrational: "What does Vibrational Healing suggest?",
        fitness: "What fitness or physical therapy approaches might help?",
        eldercare: "What should I know about elder care and legal considerations?",
        consciousness: "How does this relate to consciousness mapping (Tarot, Astrology, I Ching, Hero's Journey)?"
    };

    const message = messages[tradition] || "Tell me more about this.";
    document.getElementById('userInput').value = message;
    sendMessage();
}

// Setup quick action buttons
function setupQuickActions() {
    const quickActions = {
        'symptomBtn': "I want to explore a symptom I'm experiencing.",
        'wellnessBtn': "I want to improve my overall wellness.",
        'treatmentBtn': "I want to learn about treatment options.",
        'preventionBtn': "I want to focus on prevention and health optimization."
    };

    Object.keys(quickActions).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                document.getElementById('userInput').value = quickActions[btnId];
                sendMessage();
            });
        }
    });
}

// Send message
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;

    console.log('Sending message:', message);

    // Clear input
    userInput.value = '';
    
    // Add user message to chat
    addMessage('user', message);
    
    // Show typing indicator
    showTypingIndicator();

    try {
        // If no conversation exists, create one
        if (!currentConversationId) {
            await createConversation(message);
        } else {
            await sendMessageToConversation(message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addMessage('system', `Error: ${error.message}. The backend may still be waking up. Please wait 30 seconds and try again.`);
    }
}

// Create new conversation
async function createConversation(initialMessage) {
    try {
        console.log('Creating conversation with message:', initialMessage);
        
        const response = await fetch(`${API_URL}/api/chat/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                initial_message: initialMessage
            })
        });

        console.log('Create conversation response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                console.error('Auth token expired');
                localStorage.removeItem('authToken');
                window.location.href = 'auth.html';
                return;
            }
            const errorData = await response.json().catch(() => ({}));
            console.error('Create conversation error:', errorData);
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Create conversation response:', data);
        
        if (data.success && data.data) {
            currentConversationId = data.data.conversation.id;
            console.log('Conversation created:', currentConversationId);
            
            hideTypingIndicator();
            
            // Add AI response
            if (data.data.message) {
                addMessage('assistant', data.data.message.content);
            }
        } else {
            throw new Error('Invalid response format from server');
        }
    } catch (error) {
        console.error('Error creating conversation:', error);
        hideTypingIndicator();
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            addMessage('system', 'Cannot reach backend server. It may be waking up (takes 30-60 seconds). Please try again in a moment.');
        } else {
            addMessage('system', `Error: ${error.message}`);
        }
    }
}

// Send message to existing conversation
async function sendMessageToConversation(message) {
    try {
        console.log('Sending message to conversation:', currentConversationId);
        
        const response = await fetch(`${API_URL}/api/chat/conversations/${currentConversationId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                content: message
            })
        });

        console.log('Send message response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                console.error('Auth token expired');
                localStorage.removeItem('authToken');
                window.location.href = 'auth.html';
                return;
            }
            const errorData = await response.json().catch(() => ({}));
            console.error('Send message error:', errorData);
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log('Send message response:', data);
        
        hideTypingIndicator();
        
        if (data.success && data.data && data.data.message) {
            addMessage('assistant', data.data.message.content);
        } else {
            throw new Error('Invalid response format from server');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            addMessage('system', 'Cannot reach backend server. Please wait a moment and try again.');
        } else {
            addMessage('system', `Error: ${error.message}`);
        }
    }
}

// Add message to chat
function addMessage(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    // Format content with line breaks
    const formattedContent = content.replace(/\n/g, '<br>');
    
    if (role === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>YOU</strong><br>
                ${formattedContent}
            </div>
        `;
    } else if (role === 'assistant') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>TREE OF LIFE AI</strong><br>
                ${formattedContent}
            </div>
        `;
    } else if (role === 'system') {
        messageDiv.innerHTML = `
            <div class="message-content">
                <strong>SYSTEM</strong><br>
                ${formattedContent}
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'message assistant-message';
    typingDiv.innerHTML = `
        <div class="message-content">
            <strong>TREE OF LIFE AI</strong><br>
            <span class="typing-dots">
                <span>.</span><span>.</span><span>.</span>
            </span>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// New conversation button
function startNewConversation() {
    console.log('Starting new conversation');
    currentConversationId = null;
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    initializeChat();
}

// Export for use in HTML
window.startNewConversation = startNewConversation;

// Debug: Log all localStorage on load
console.log('LocalStorage contents:', {
    authToken: localStorage.getItem('authToken') ? 'EXISTS' : 'MISSING',
    userEmail: localStorage.getItem('userEmail')
});
