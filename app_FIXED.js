// API Configuration
const API_URL = 'https://treeoflife-vn25.onrender.com';
let currentConversationId = null;
let authToken = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    authToken = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');
    
    if (!authToken) {
        // Redirect to login if not authenticated
        window.location.href = 'auth.html';
        return;
    }

    // Show user email in header if logged in
    if (userEmail) {
        console.log('Logged in as:', userEmail);
    }

    // Initialize chat
    initializeChat();
    setupEventListeners();
});

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
        addMessage('system', 'Sorry, there was an error processing your message. Please try again.');
    }
}

// Create new conversation
async function createConversation(initialMessage) {
    try {
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

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, redirect to login
                localStorage.removeItem('authToken');
                window.location.href = 'auth.html';
                return;
            }
            throw new Error('Failed to create conversation');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
            currentConversationId = data.data.conversation.id;
            
            hideTypingIndicator();
            
            // Add AI response
            if (data.data.message) {
                addMessage('assistant', data.data.message.content);
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error creating conversation:', error);
        hideTypingIndicator();
        addMessage('system', 'Sorry, there was an error starting the conversation. Please try again.');
    }
}

// Send message to existing conversation
async function sendMessageToConversation(message) {
    try {
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

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                window.location.href = 'auth.html';
                return;
            }
            throw new Error('Failed to send message');
        }

        const data = await response.json();
        
        hideTypingIndicator();
        
        if (data.success && data.data && data.data.message) {
            addMessage('assistant', data.data.message.content);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addMessage('system', 'Sorry, there was an error processing your message. Please try again.');
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
                <strong>AI MEDIC</strong><br>
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
            <strong>AI MEDIC</strong><br>
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
    currentConversationId = null;
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    initializeChat();
}

// Export for use in HTML
window.startNewConversation = startNewConversation;
