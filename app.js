// ===================================
// TREE OF LIFE AI - FRONTEND APPLICATION
// Connects to: tree-of-life-ai-production.up.railway.app
// ===================================

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://tree-of-life-ai-production.up.railway.app',
    API_TIMEOUT: 30000, // 30 seconds
};

// State Management
const state = {
    currentUser: null,
    currentConversationId: null,
    conversationHistory: [],
    selectedTradition: 'all',
    isLoading: false,
};

// ===================================
// INITIALIZATION
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Tree of Life AI Frontend initialized');
    checkAuthStatus();
    loadConversationHistory();
    adjustTextareaHeight();
});

// ===================================
// AUTHENTICATION
// ===================================
function checkAuthStatus() {
    const token = localStorage.getItem('tree_of_life_token');
    const user = localStorage.getItem('tree_of_life_user');
    
    if (token && user) {
        state.currentUser = JSON.parse(user);
        document.getElementById('loginBtn').textContent = 'Logout';
        document.getElementById('loginBtn').onclick = logout;
    }
}

function showLogin() {
    if (state.currentUser) {
        logout();
    } else {
        document.getElementById('authModal').classList.add('active');
        document.getElementById('modalTitle').textContent = 'Login';
    }
}

function closeModal() {
    document.getElementById('authModal').classList.remove('active');
}

function switchToRegister() {
    document.getElementById('modalTitle').textContent = 'Register';
    // Add registration fields logic here
}

async function login(email, password) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('tree_of_life_token', data.data.token);
            localStorage.setItem('tree_of_life_user', JSON.stringify(data.data.user));
            state.currentUser = data.data.user;
            closeModal();
            location.reload();
        } else {
            alert('Login failed: ' + data.error.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

function logout() {
    localStorage.removeItem('tree_of_life_token');
    localStorage.removeItem('tree_of_life_user');
    state.currentUser = null;
    location.reload();
}

// ===================================
// CHAT FUNCTIONALITY
// ===================================
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || state.isLoading) return;
    
    // Hide welcome screen
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }
    
    // Add user message to UI
    addMessageToUI(message, 'user');
    
    // Clear input
    input.value = '';
    adjustTextareaHeight();
    
    // Disable send button
    state.isLoading = true;
    document.getElementById('sendBtn').disabled = true;
    
    // Show loading
    showLoading(true);
    
    try {
        // Call API
        const response = await callChatAPI(message);
        
        // Add AI response to UI
        addMessageToUI(response.content, 'assistant', response.emergency);
        
        // Update conversation history
        state.conversationHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: response.content }
        );
        
    } catch (error) {
        console.error('Chat error:', error);
        addMessageToUI(
            'Sorry, I encountered an error. Please try again.',
            'assistant',
            false
        );
    } finally {
        state.isLoading = false;
        document.getElementById('sendBtn').disabled = false;
        showLoading(false);
    }
}

async function callChatAPI(message) {
    const token = localStorage.getItem('tree_of_life_token');
    
    // For demo without auth, use a test endpoint
    const endpoint = token 
        ? `${CONFIG.API_BASE_URL}/api/chat/conversations/${state.currentConversationId}/messages`
        : `${CONFIG.API_BASE_URL}/api/chat/demo`; // Demo endpoint
    
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            content: message,
            context: {
                tradition: state.selectedTradition,
                conversation_history: state.conversationHistory.slice(-6), // Last 3 exchanges
            }
        }),
    });
    
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
        return {
            content: data.data.message.content,
            emergency: data.data.message.emergency_detected || false,
        };
    } else {
        throw new Error(data.error.message);
    }
}

function addMessageToUI(content, role, isEmergency = false) {
    const chatMessages = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = `message-content ${isEmergency ? 'emergency-alert' : ''}`;
    contentDiv.innerHTML = formatMessageContent(content);
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    metaDiv.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(metaDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessageContent(content) {
    // Convert markdown-style formatting to HTML
    let formatted = content;
    
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Emergency emoji
    if (content.includes('🚨') || content.includes('emergency')) {
        formatted = '🚨 ' + formatted;
    }
    
    return formatted;
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function adjustTextareaHeight() {
    const textarea = document.getElementById('messageInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
}

// Add input listener for auto-resize
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('messageInput');
    if (textarea) {
        textarea.addEventListener('input', adjustTextareaHeight);
    }
});

// ===================================
// SAMPLE QUESTIONS
// ===================================
function askSample(question) {
    document.getElementById('messageInput').value = question;
    sendMessage();
}

// ===================================
// NEW CHAT
// ===================================
function newChat() {
    // Clear conversation
    state.conversationHistory = [];
    state.currentConversationId = null;
    
    // Clear UI
    document.getElementById('chatMessages').innerHTML = '';
    document.getElementById('welcomeScreen').style.display = 'block';
    
    // Focus input
    document.getElementById('messageInput').focus();
}

// ===================================
// TRADITION SELECTION
// ===================================
function selectTradition(tradition) {
    state.selectedTradition = tradition;
    
    // Update UI - highlight selected button
    document.querySelectorAll('.tradition-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Show notification
    const traditionNames = {
        'all': 'All Medical Traditions',
        'western': 'Western Medicine',
        'ayurveda': 'Ayurveda',
        'tcm': 'Traditional Chinese Medicine',
        'herbal': 'Herbal Medicine',
        'homeopathy': 'Homeopathy',
        'chiropractic': 'Chiropractic',
        'nutrition': 'Clinical Nutrition',
        'vibrational': 'Vibrational Healing',
        'physical': 'Physical Therapy'
    };
    
    addMessageToUI(
        `Now focusing on: ${traditionNames[tradition]}`,
        'assistant'
    );
}

// ===================================
// HISTORY & PROFILE
// ===================================
function showHistory() {
    alert('Chat history feature coming soon!');
    // TODO: Load and display conversation history
}

function showProfile() {
    alert('Health profile feature coming soon!');
    // TODO: Show health profile form
}

function showSettings() {
    alert('Settings feature coming soon!');
    // TODO: Show settings panel
}

// ===================================
// FOOTER LINKS
// ===================================
function showAbout() {
    alert('Tree of Life AI - Integrative Health Intelligence Platform\n\nCombining wisdom from 9 medical traditions:\n• Western Medicine\n• Ayurveda\n• Traditional Chinese Medicine\n• Herbal Medicine\n• Homeopathy\n• Chiropractic\n• Clinical Nutrition\n• Vibrational Healing\n• Physical Therapy');
}

function showPricing() {
    alert('Pricing Plans:\n\nFree: 10 conversations/month\nPremium: $9.99/month - Unlimited\nPro: $29.99/month - For practitioners');
}

function showPrivacy() {
    alert('Privacy Policy\n\nYour health data is encrypted and never sold to third parties.\n\nFull privacy policy coming soon.');
}

function showTerms() {
    alert('Terms of Service\n\nEducational information only.\nNot medical advice.\nAlways consult healthcare professionals.\n\nFull terms coming soon.');
}

// ===================================
// LOADING SPINNER
// ===================================
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}

// ===================================
// CONVERSATION HISTORY
// ===================================
function loadConversationHistory() {
    const saved = localStorage.getItem('tree_of_life_history');
    if (saved) {
        try {
            state.conversationHistory = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }
}

function saveConversationHistory() {
    try {
        localStorage.setItem('tree_of_life_history', JSON.stringify(state.conversationHistory));
    } catch (e) {
        console.error('Failed to save history:', e);
    }
}

// Auto-save history after each message
setInterval(() => {
    if (state.conversationHistory.length > 0) {
        saveConversationHistory();
    }
}, 5000);

// ===================================
// ERROR HANDLING
// ===================================
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show user errors for everything, just log them
});

// ===================================
// MOBILE SIDEBAR TOGGLE
// ===================================
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// Add mobile menu button functionality
if (window.innerWidth <= 768) {
    const header = document.querySelector('.top-header');
    const menuBtn = document.createElement('button');
    menuBtn.className = 'nav-btn';
    menuBtn.textContent = '☰ Menu';
    menuBtn.onclick = toggleSidebar;
    header.insertBefore(menuBtn, header.firstChild);
}

console.log('Tree of Life AI app.js loaded successfully');
console.log('Backend API:', CONFIG.API_BASE_URL);
