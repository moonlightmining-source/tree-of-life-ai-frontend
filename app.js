// Tree of Life AI - Main Application JavaScript
// API Configuration
const API_BASE = 'https://treeoflife-vn25.onrender.com';

// Global state
let selectedTraditions = [];
let conversationId = null;
let authToken = null;

// DOM Elements
let chatMessages, chatInput, sendBtn, loadingIndicator, traditionBtns;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌿 Tree of Life AI - Initializing...');
    
    // Get DOM elements
    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    sendBtn = document.getElementById('send-btn');
    loadingIndicator = document.getElementById('loading');
    traditionBtns = document.querySelectorAll('.tradition-btn');
    
    // Check authentication
    authToken = localStorage.getItem('authToken');
    console.log('Auth token exists:', !!authToken);
    
    if (!authToken) {
        console.log('❌ No auth token found - redirecting to auth page');
        window.location.href = 'auth.html';
        return;
    }
    
    console.log('✅ Auth token found - initializing app');
    initializeApp();
});

// Initialize application
function initializeApp() {
    console.log('Setting up event listeners...');
    setupEventListeners();
    
    console.log('Displaying welcome message...');
    displayWelcomeMessage();
    
    console.log('✅ App initialized successfully');
}

// Setup event listeners
function setupEventListeners() {
    // Send button
    sendBtn.addEventListener('click', sendMessage);
    
    // Enter key to send (Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Tradition buttons
    traditionBtns.forEach(btn => {
        btn.addEventListener('click', () => toggleTradition(btn));
    });
}

// Display welcome message
function displayWelcomeMessage() {
    const welcomeMessage = {
        role: 'system',
        content: `
            <h3>Welcome to Tree of Life AI 🌿</h3>
            <p>I'm your integrative health intelligence assistant. I can provide guidance from multiple medical traditions:</p>
            <ul>
                <li>Western Medicine</li>
                <li>Ayurveda</li>
                <li>Traditional Chinese Medicine</li>
                <li>Herbal Medicine</li>
                <li>Homeopathy</li>
                <li>Naturopathy</li>
                <li>Fitness & Physical Therapy</li>
                <li>Elder Care & Law</li>
            </ul>
            <p><strong>How can I help you today?</strong></p>
            <p style="font-size: 0.85em; color: #B8860B; margin-top: 1rem;">
                💡 Tip: Click tradition buttons above to focus on specific perspectives, 
                or ask freely and I'll integrate multiple traditions naturally.
            </p>
        `
    };
    
    displayMessage(welcomeMessage);
}

// Toggle tradition selection
function toggleTradition(btn) {
    const tradition = btn.dataset.tradition;
    
    if (btn.classList.contains('selected')) {
        // Deselect
        btn.classList.remove('selected');
        selectedTraditions = selectedTraditions.filter(t => t !== tradition);
    } else {
        // Select
        btn.classList.add('selected');
        selectedTraditions.push(tradition);
    }
    
    // Display tradition selection message
    if (selectedTraditions.length > 0) {
        const traditionNames = selectedTraditions.map(t => {
            const btnElement = document.querySelector(`[data-tradition="${t}"]`);
            return btnElement ? btnElement.textContent : t;
        });
        
        displayMessage({
            role: 'system',
            content: `Focusing on: <strong>${traditionNames.join(', ')}</strong>`
        });
    }
}

// Send message
async function sendMessage() {
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    console.log('📤 Sending message:', message);
    
    // Display user message
    displayMessage({ role: 'user', content: message });
    
    // Clear input
    chatInput.value = '';
    
    // Disable send button
    sendBtn.disabled = true;
    loadingIndicator.classList.add('active');
    
    try {
        // Create conversation if needed
        if (!conversationId) {
            console.log('Creating new conversation...');
            await createConversation(message);
        } else {
            console.log('Sending to existing conversation:', conversationId);
            await sendChatMessage(message);
        }
    } catch (error) {
        console.error('❌ Error sending message:', error);
        displayMessage({
            role: 'system',
            content: `❌ <strong>Error:</strong> ${error.message || 'Failed to send message. Please try again.'}`
        });
    } finally {
        sendBtn.disabled = false;
        loadingIndicator.classList.remove('active');
    }
}

// Create conversation
async function createConversation(initialMessage) {
    console.log('🔄 POST /api/chat/conversations');
    
    const response = await fetch(`${API_BASE}/api/chat/conversations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            initial_message: initialMessage,
            traditions: selectedTraditions.length > 0 ? selectedTraditions : null
        })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
        if (response.status === 401) {
            console.log('❌ 401 Unauthorized - clearing token and redirecting');
            localStorage.removeItem('authToken');
            window.location.href = 'auth.html';
            throw new Error('Session expired. Please log in again.');
        }
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Conversation created:', data.data.conversation.id);
    
    conversationId = data.data.conversation.id;
    
    // Display AI response
    displayMessage({
        role: 'ai',
        content: data.data.message.content
    });
}

// Send chat message
async function sendChatMessage(message) {
    console.log(`🔄 POST /api/chat/conversations/${conversationId}/messages`);
    
    const response = await fetch(
        `${API_BASE}/api/chat/conversations/${conversationId}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                content: message,
                traditions: selectedTraditions.length > 0 ? selectedTraditions : null
            })
        }
    );
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
        if (response.status === 401) {
            console.log('❌ 401 Unauthorized - clearing token and redirecting');
            localStorage.removeItem('authToken');
            window.location.href = 'auth.html';
            throw new Error('Session expired. Please log in again.');
        }
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Message sent successfully');
    
    // Display AI response
    displayMessage({
        role: 'ai',
        content: data.data.message.content
    });
    
    // Check for emergency
    if (data.data.emergency_detected) {
        console.log('🚨 Emergency detected!');
        displayEmergencyAlert();
    }
}

// Display message in chat
function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', message.role);
    
    // Add role label
    const roleLabel = document.createElement('div');
    roleLabel.classList.add('message-role');
    roleLabel.textContent = message.role === 'user' ? 'You' : 
                           message.role === 'ai' ? 'Tree of Life AI' : 'System';
    
    // Add content
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerHTML = message.content;
    
    messageDiv.appendChild(roleLabel);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Display emergency alert
function displayEmergencyAlert() {
    const alertMessage = {
        role: 'system',
        content: `
            <div style="background: rgba(220, 38, 38, 0.2); border: 2px solid #DC2626; padding: 1rem; border-radius: 10px;">
                <h3 style="color: #FF6B6B; margin-bottom: 0.5rem;">🚨 EMERGENCY DETECTED</h3>
                <p style="color: #FFD700;">
                    If you are experiencing a medical emergency, please call <strong>911</strong> 
                    or go to the nearest emergency room immediately.
                </p>
                <p style="color: #FFBF00; font-size: 0.9em; margin-top: 0.5rem;">
                    Do not wait for online advice in emergency situations.
                </p>
            </div>
        `
    };
    
    displayMessage(alertMessage);
}

// Logout function
function logout() {
    console.log('🚪 Logging out...');
    localStorage.removeItem('authToken');
    window.location.href = 'auth.html';
}

// Make logout available globally
window.logout = logout;
