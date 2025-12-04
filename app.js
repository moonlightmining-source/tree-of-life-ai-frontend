// Tree of Life AI - Frontend Application with Authentication
// Backend API URL
const API_BASE = 'https://tree-of-life-ai-production.up.railway.app';

// State management
let conversationId = null;
let selectedTraditions = [];
let currentUser = null;
let authToken = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initializeEventListeners();
    displayWelcomeMessage();
});

// Check if user is authenticated
function checkAuthentication() {
    authToken = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!authToken || !userStr) {
        // Not authenticated, redirect to login
        window.location.href = 'auth.html';
        return;
    }
    
    currentUser = JSON.parse(userStr);
    displayUserInfo();
}

// Display user info in header
function displayUserInfo() {
    const logoContainer = document.querySelector('.logo-container');
    const userInfo = document.createElement('div');
    userInfo.style.cssText = `
        margin-top: 0.5rem;
        color: var(--gold-medium);
        font-size: 0.85rem;
    `;
    userInfo.innerHTML = `
        Welcome, ${currentUser.first_name || currentUser.email}! 
        <button onclick="logout()" style="
            background: transparent;
            border: 1px solid var(--gold-deep);
            color: var(--gold-light);
            padding: 0.25rem 0.75rem;
            border-radius: 15px;
            cursor: pointer;
            margin-left: 0.5rem;
            font-size: 0.8rem;
        ">Logout</button>
    `;
    logoContainer.appendChild(userInfo);
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'auth.html';
}

// Initialize event listeners
function initializeEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    const traditionBtns = document.querySelectorAll('.tradition-btn');

    // Send button click
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    // Enter key to send
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Tradition button clicks
    traditionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tradition = this.getAttribute('data-tradition');
            toggleTradition(tradition, this);
        });
    });
}

// Display welcome message
function displayWelcomeMessage() {
    const messagesDiv = document.getElementById('chat-messages');
    const welcomeMessage = `
        <div class="message ai">
            <div class="message-role">Tree of Life AI</div>
            <div class="message-content">
                <p>Welcome${currentUser ? ', ' + currentUser.first_name : ''}! I'm your integrative health companion, here to provide guidance from multiple medical traditions.</p>
                <p>🌿 I can offer perspectives from:</p>
                <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
                    <li>Western Medicine</li>
                    <li>Ayurvedic Medicine</li>
                    <li>Traditional Chinese Medicine (TCM)</li>
                    <li>Herbal Medicine</li>
                    <li>Homeopathy</li>
                    <li>Naturopathy</li>
                    <li>And more...</li>
                </ul>
                <p style="margin-top: 1rem;">⚠️ <strong>Important:</strong> I provide educational information only. Always consult qualified healthcare professionals for medical advice.</p>
                <p style="margin-top: 0.5rem;">How can I help you today?</p>
            </div>
        </div>
    `;
    messagesDiv.innerHTML = welcomeMessage;
}

// Toggle tradition selection
function toggleTradition(tradition, button) {
    const index = selectedTraditions.indexOf(tradition);
    
    if (index > -1) {
        // Remove tradition
        selectedTraditions.splice(index, 1);
        button.style.opacity = '1';
        button.style.background = 'var(--metallic-gold)';
    } else {
        // Add tradition
        selectedTraditions.push(tradition);
        button.style.opacity = '0.6';
        button.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
    }
}

// Send message to API
async function sendMessage() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesDiv = document.getElementById('chat-messages');
    const loadingDiv = document.getElementById('loading');
    
    const message = input.value.trim();
    
    if (!message) {
        return;
    }

    // Disable input while processing
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    // Add user message to chat
    appendMessage('user', message);
    input.value = '';

    // Show loading indicator
    loadingDiv.classList.add('active');

    try {
        // Create conversation if first message
        if (!conversationId) {
            conversationId = await createConversation(message);
        } else {
            // Send message to existing conversation
            await sendMessageToConversation(message);
        }
    } catch (error) {
        console.error('Error:', error);
        appendMessage('system', `Error: ${error.message}. Please try again.`);
        
        // If authentication error, redirect to login
        if (error.message.includes('authentication') || error.message.includes('token')) {
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'auth.html';
            }, 2000);
        }
    } finally {
        // Re-enable input
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        loadingDiv.classList.remove('active');
    }
}

// Create new conversation
async function createConversation(initialMessage) {
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

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create conversation');
    }

    const data = await response.json();
    
    // Display AI response
    if (data.response) {
        appendMessage('ai', data.response);
    }
    
    return data.conversation_id;
}

// Send message to existing conversation
async function sendMessageToConversation(message) {
    const response = await fetch(`${API_BASE}/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
            content: message,
            traditions: selectedTraditions.length > 0 ? selectedTraditions : null
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send message');
    }

    const data = await response.json();
    
    // Display AI response
    if (data.response) {
        appendMessage('ai', data.response);
    }
}

// Append message to chat
function appendMessage(role, content) {
    const messagesDiv = document.getElementById('chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const roleDiv = document.createElement('div');
    roleDiv.className = 'message-role';
    roleDiv.textContent = role === 'user' ? 'You' : 
                          role === 'ai' ? 'Tree of Life AI' : 
                          'System';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Parse markdown-like formatting
    const formattedContent = formatMessageContent(content);
    contentDiv.innerHTML = formattedContent;
    
    messageDiv.appendChild(roleDiv);
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Format message content (basic markdown support)
function formatMessageContent(content) {
    // Convert **bold** to <strong>
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    // Convert bullet points
    content = content.replace(/^- (.+)$/gm, '• $1');
    
    return content;
}

// Health check on load
async function healthCheck() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('Backend status:', data);
    } catch (error) {
        console.error('Backend health check failed:', error);
    }
}

// Run health check
healthCheck();
