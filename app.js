// Tree of Life AI - Main Application Logic
// Matches original sidebar design with delayed authentication

const API_URL = 'https://treeoflife-vn25.onrender.com/api';

console.log('🌿 Tree of Life AI - Initializing...');

// Global variables
let conversationId = null;
let selectedTradition = 'all';

// NO IMMEDIATE AUTH CHECK - Let users browse freely
console.log('✅ Interface loaded - Login required only for chatting');

// Function to send message to AI (called from index.html)
window.sendMessageToAI = async function(message) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        console.error('❌ No auth token found');
        alert('Please login to chat');
        return;
    }

    console.log('📤 Sending message to AI:', message);

    // Hide welcome section, show messages container
    const welcomeSection = document.getElementById('welcomeSection');
    const messagesContainer = document.getElementById('messagesContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'block';

    // Add user message to UI
    addMessageToUI('user', message);

    // Show loading
    if (loadingIndicator) loadingIndicator.classList.add('active');

    try {
        // Create conversation if needed
        if (!conversationId) {
            conversationId = await createConversation(token);
        }

        // Send message to API
        const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: message,
                tradition: selectedTradition
            })
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                console.error('❌ Unauthorized - token expired');
                alert('Your session has expired. Please login again.');
                localStorage.removeItem('authToken');
                window.location.href = 'auth.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ AI Response received');

        // Add AI response to UI
        if (data.content) {
            addMessageToUI('ai', data.content);
        }

        // Check for emergency
        if (data.emergency_detected) {
            alert('🚨 EMERGENCY DETECTED: ' + data.content);
        }

    } catch (error) {
        console.error('❌ Error sending message:', error);
        addMessageToUI('system', 'Sorry, there was an error processing your message. Please try again.');
    } finally {
        if (loadingIndicator) loadingIndicator.classList.remove('active');
    }
};

// Create new conversation
async function createConversation(token) {
    console.log('🔄 Creating new conversation...');
    
    try {
        const response = await fetch(`${API_URL}/chat/conversations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: 'New Conversation'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create conversation: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Conversation created:', data.id);
        return data.id;
    } catch (error) {
        console.error('❌ Error creating conversation:', error);
        throw error;
    }
}

// Add message to UI
function addMessageToUI(role, content) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const roleLabel = role === 'user' ? 'YOU' : role === 'ai' ? 'TREE OF LIFE AI' : 'SYSTEM';
    
    messageDiv.innerHTML = `
        <div class="role">${roleLabel}</div>
        <div class="content">${formatMessage(content)}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Format message content
function formatMessage(text) {
    // Convert markdown-style formatting
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    
    return formatted;
}

// Tradition button handler (called from index.html)
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Setting up tradition button handlers...');
    
    const traditionBtns = document.querySelectorAll('.tradition-btn');
    traditionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            selectedTradition = this.dataset.tradition || 'all';
            console.log('🌿 Selected tradition:', selectedTradition);
            
            // Update placeholder
            const input = document.getElementById('userInput');
            if (input) {
                if (selectedTradition === 'all') {
                    input.placeholder = 'Ask about your health from multiple traditions...';
                } else {
                    input.placeholder = `Ask about ${this.textContent.toLowerCase()} perspectives...`;
                }
            }
            
            // Visual feedback
            traditionBtns.forEach(b => b.style.background = 'rgba(255, 215, 0, 0.05)');
            this.style.background = 'rgba(255, 215, 0, 0.2)';
        });
    });
});

// Check if user is logged in (for status display only, not redirect)
const authToken = localStorage.getItem('authToken');
if (authToken) {
    console.log('✅ User is logged in');
} else {
    console.log('ℹ️ User not logged in - login required to chat');
}

console.log('✅ App initialized successfully');
