// API Configuration
const API_BASE_URL = 'https://treeoflife-vn25.onrender.com';
let currentConversationId = null;
let authToken = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    authToken = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');
    
    if (!authToken) {
        console.log('No auth token found - user needs to login');
        // Don't redirect automatically, let them browse the page
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
    const messagesContainer = document.getElementById('messagesContainer');
    
    if (!messagesContainer) {
        console.error('messagesContainer element not found');
        return;
    }
    
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
    const sendButton = document.getElementById('sendBtn');
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

// Send message - MAIN FUNCTION
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;

    // Check auth token
    const token = localStorage.getItem('authToken');
    if (!token) {
        if (confirm('Please login to chat with Tree of Life AI. Redirect to login?')) {
            window.location.href = 'auth.html';
        }
        return;
    }

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
        addMessage('system', `Sorry, there was an error: ${error.message}. Please check your connection and try again.`);
    }
}

// EXPOSE to window for HTML onclick handlers
window.sendMessageToAI = sendMessage;

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
                alert('Session expired. Please login again.');
                window.location.href = 'auth.html';
                return;
            } else if (response.status === 404) {
                throw new Error('API endpoint not found. Backend may not be running or the endpoint URL is incorrect.');
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to create conversation: ${response.status} - ${errorText}`);
            }
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
            throw new Error('Invalid response format from server');
        }
    } catch (error) {
        console.error('Error creating conversation:', error);
        hideTypingIndicator();
        addMessage('system', `Sorry, there was an error starting the conversation: ${error.message}`);
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
                alert('Session expired. Please login again.');
                window.location.href = 'auth.html';
                return;
            } else if (response.status === 404) {
                throw new Error('Conversation not found. Starting a new conversation...');
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            }
        }

        const data = await response.json();
        
        hideTypingIndicator();
        
        if (data.success && data.data && data.data.message) {
            addMessage('assistant', data.data.message.content);
        } else {
            throw new Error('Invalid response format from server');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        
        // If conversation not found, reset and try creating new one
        if (error.message.includes('not found')) {
            currentConversationId = null;
            addMessage('system', 'Starting a new conversation...');
            await createConversation(message);
        } else {
            addMessage('system', `Sorry, there was an error: ${error.message}`);
        }
    }
}

// Add message to chat
function addMessage(role, content) {
    const messagesContainer = document.getElementById('messagesContainer');
    const welcomeSection = document.getElementById('welcomeSection');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (!messagesContainer) {
        console.error('messagesContainer not found');
        return;
    }
    
    // Hide welcome section on first message
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
    }
    
    // Show messages container
    messagesContainer.style.display = 'block';
    
    // Hide loading indicator
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Format content with line breaks
    const formattedContent = content.replace(/\n/g, '<br>');
    
    if (role === 'user') {
        messageDiv.innerHTML = `
            <div class="message-role">You</div>
            <div class="message-content">${formattedContent}</div>
        `;
    } else if (role === 'assistant') {
        messageDiv.innerHTML = `
            <div class="message-role">Tree of Life AI</div>
            <div class="message-content">${formattedContent}</div>
        `;
    } else if (role === 'system') {
        messageDiv.innerHTML = `
            <div class="message-role">System</div>
            <div class="message-content">${formattedContent}</div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Show typing indicator
function showTypingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// New conversation button
function startNewConversation() {
    currentConversationId = null;
    const messagesContainer = document.getElementById('messagesContainer');
    const welcomeSection = document.getElementById('welcomeSection');
    
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
        messagesContainer.style.display = 'none';
    }
    
    if (welcomeSection) {
        welcomeSection.style.display = 'block';
    }
    
    initializeChat();
}

// Export for use in HTML
window.startNewConversation = startNewConversation;
window.sendMessage = sendMessage;

console.log('🌿 Tree of Life AI app.js loaded');
