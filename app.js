// Tree of Life AI - Chat Interface
// Updated with: Print Button + Personalized AI addressing
// 🔧 FIXED: Backend request format and response handling

const API_BASE = 'https://treeoflife-vn25.onrender.com';

let currentConversationId = null;
let authToken = localStorage.getItem('authToken');
let userName = localStorage.getItem('userName') || 'friend'; // Get user's first name

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're loading a saved conversation
    const savedConversationId = localStorage.getItem('currentConversationId');
    
    // Only load conversation if logged in
    if (authToken && savedConversationId) {
        // Load saved conversation (don't show welcome message yet)
        loadCurrentConversation();
    } else {
        // New session - show welcome message
        displayWelcomeMessage();
    }
    
    setupEventListeners();
});

function displayWelcomeMessage() {
    // Show personalized greeting in chat
    const greeting = authToken ? `Hello ${userName}! 🌿` : `Welcome! 🌿`;
    
    const welcomeMessage = {
        role: 'assistant',
        content: `${greeting} I'm Tree of Life AI. I provide health guidance from 11 medical traditions: Western Medicine, Ayurveda, TCM, Herbal Medicine, Homeopathy, Chiropractic, Clinical Nutrition, Vibrational Healing, Fitness & Physical Therapy, Elder Care & Law, and Consciousness Mapping. ${authToken ? 'What health topic can I help you explore?' : 'Please log in to start a conversation.'}`,
        timestamp: new Date().toISOString()
    };
    
    displayMessage(welcomeMessage);
}

function handleAuthError() {
    // Clear invalid auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('currentConversationId');
    
    // Show user-friendly message
    displayMessage({
        role: 'assistant',
        content: '⚠️ Your session has expired. Redirecting you to the login page...',
        timestamp: new Date().toISOString()
    });
    
    // Redirect to login after brief delay
    setTimeout(() => {
        window.location.href = 'auth.html';
    }, 2000);
}

// Logout function - called by logout button
function logout() {
    // Clear all auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('currentConversationId');
    
    // Redirect immediately to login
    window.location.href = 'auth.html';
}

function setupEventListeners() {
    // Send message on button click
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new line)
    document.getElementById('userInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Print button click
    const printBtn = document.getElementById('printChatBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printConversation);
    }
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input
    input.value = '';
    
    // Display user message immediately
    displayMessage({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });
    
    // Show loading
    showLoadingIndicator();
    
    try {
        if (!currentConversationId) {
            // Create new conversation with user's name
            await createConversation(message);
        } else {
            // Send message to existing conversation
            await sendMessageToConversation(message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Don't show error if it's auth error (already handled)
        if (error.message !== 'Authentication required') {
            displayMessage({
                role: 'assistant',
                content: `❌ ${error.message || 'Sorry, I encountered an error. Please try again.'}`,
                timestamp: new Date().toISOString()
            });
        }
    } finally {
        hideLoadingIndicator();
    }
}

async function createConversation(initialMessage) {
    const response = await fetch(`${API_BASE}/api/chat/conversations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
            initial_message: initialMessage
        })
    });
    
    // Handle authentication errors
    if (response.status === 401) {
        handleAuthError();
        throw new Error('Authentication required');
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create conversation');
    }
    
    const data = await response.json();
    
    // 🔧 FIX: Backend returns conversation and messages directly (no "success" wrapper)
    currentConversationId = data.conversation.id;
    localStorage.setItem('currentConversationId', currentConversationId);
    
    // Display AI response (it's the second message in the array)
    const aiMessage = data.messages.find(msg => msg.role === 'assistant');
    if (aiMessage) {
        displayMessage({
            role: 'assistant',
            content: aiMessage.content,
            timestamp: data.conversation.created_at
        });
    }
    
    // Show print button now that we have messages
    showPrintButton();
}

async function sendMessageToConversation(message) {
    const response = await fetch(`${API_BASE}/api/chat/conversations/${currentConversationId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
            message: message  // 🔧 FIX: Backend expects "message" not "content"
        })
    });
    
    // Handle authentication errors
    if (response.status === 401) {
        handleAuthError();
        throw new Error('Authentication required');
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send message');
    }
    
    const data = await response.json();
    
    // 🔧 FIX: Backend returns message directly in data.message
    displayMessage({
        role: 'assistant',
        content: data.message.content,
        timestamp: data.message.timestamp
    });
}

async function loadCurrentConversation() {
    const savedConversationId = localStorage.getItem('currentConversationId');
    
    if (!savedConversationId) return;
    
    try {
        console.log('📂 Loading conversation:', savedConversationId);
        const response = await fetch(`${API_BASE}/api/chat/conversations/${savedConversationId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        // Handle authentication errors
        if (response.status === 401) {
            handleAuthError();
            return;
        }
        
        if (!response.ok) {
            console.error('❌ Failed to load conversation, status:', response.status);
            // Conversation not found, start fresh
            localStorage.removeItem('currentConversationId');
            return;
        }
        
        const data = await response.json();
        console.log('✅ Loaded conversation:', data);
        console.log('📊 Messages found:', data.messages.length);
        
        currentConversationId = savedConversationId;
        
        // Only clear and load if there are messages
        if (data.messages && data.messages.length > 0) {
            // Clear chat window before loading messages
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            // Display all messages
            data.messages.forEach(msg => {
                displayMessage(msg);
            });
        }
        
        console.log(`💬 Displayed ${data.messages.length} messages`);
        
        // Show print button if we have messages
        if (data.messages.length > 0) {
            showPrintButton();
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

function displayMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;
    
    const time = new Date(message.timestamp || message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">${formatMessageContent(message.content)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Update print button visibility
    if (typeof updatePrintButton === 'function') {
        updatePrintButton();
    }
}

function formatMessageContent(content) {
    // Convert markdown-style formatting to HTML
    let formatted = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
        .replace(/\n/g, '<br>'); // Line breaks
    
    return formatted;
}

function showLoadingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant loading-message';
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideLoadingIndicator() {
    const loading = document.getElementById('loadingIndicator');
    if (loading) {
        loading.remove();
    }
}

function showPrintButton() {
    // Show the print button container
    const printContainer = document.getElementById('printButtonContainer');
    if (printContainer) {
        printContainer.classList.add('active');
    }
}

// ==========================================
// PRINT FUNCTIONALITY
// ==========================================

function printConversation() {
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatMessages || chatMessages.children.length === 0) {
        alert('No messages to print!');
        return;
    }
    
    // Create print window content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tree of Life AI - Conversation</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 40px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .print-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #D4A574;
                }
                
                .print-logo {
                    width: 150px;
                    margin-bottom: 20px;
                }
                
                .print-title {
                    font-size: 24px;
                    color: #B8860B;
                    margin-bottom: 10px;
                }
                
                .print-date {
                    color: #666;
                    font-size: 14px;
                }
                
                .print-user-info {
                    background: #f9f9f9;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    border-left: 4px solid #D4A574;
                }
                
                .message {
                    margin-bottom: 20px;
                    padding: 15px;
                    border-radius: 10px;
                    page-break-inside: avoid;
                }
                
                .message.user {
                    background: #E8F4F8;
                    border-left: 4px solid #4A90E2;
                }
                
                .message.assistant {
                    background: #FFF9E6;
                    border-left: 4px solid #D4A574;
                }
                
                .message-role {
                    font-weight: 600;
                    margin-bottom: 8px;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: #666;
                }
                
                .message.user .message-role {
                    color: #4A90E2;
                }
                
                .message.assistant .message-role {
                    color: #B8860B;
                }
                
                .message-text {
                    line-height: 1.6;
                    color: #333;
                }
                
                .message-time {
                    font-size: 11px;
                    color: #999;
                    margin-top: 8px;
                }
                
                .print-footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #D4A574;
                    text-align: center;
                    color: #999;
                    font-size: 12px;
                }
                
                @media print {
                    body {
                        padding: 20px;
                    }
                    
                    .print-header {
                        margin-bottom: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <img src="Images/Tree_of_life_logo_800x800.png" alt="Tree of Life AI" class="print-logo">
                <div class="print-title">Tree of Life AI - Conversation</div>
                <div class="print-date">${new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</div>
            </div>
            
            <div class="print-user-info">
                <strong>User:</strong> ${userName}<br>
                <strong>Session:</strong> ${new Date().toLocaleString()}
            </div>
            
            <div class="messages">
                ${getMessagesForPrint()}
            </div>
            
            <div class="print-footer">
                <p><strong>Disclaimer:</strong> This conversation is for educational purposes only and does not constitute medical advice.</p>
                <p>Always consult with qualified healthcare professionals regarding your health.</p>
                <p style="margin-top: 10px;">© ${new Date().getFullYear()} Tree of Life AI</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for images to load, then print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };
}

function getMessagesForPrint() {
    const chatMessages = document.getElementById('chatMessages');
    let html = '';
    
    Array.from(chatMessages.children).forEach(msgElement => {
        if (msgElement.classList.contains('loading-message')) return; // Skip loading indicator
        
        const isUser = msgElement.classList.contains('user');
        const role = isUser ? 'You' : 'Tree of Life AI';
        const textElement = msgElement.querySelector('.message-text');
        const timeElement = msgElement.querySelector('.message-time');
        
        if (textElement) {
            html += `
                <div class="message ${isUser ? 'user' : 'assistant'}">
                    <div class="message-role">${role}</div>
                    <div class="message-text">${textElement.innerHTML}</div>
                    <div class="message-time">${timeElement ? timeElement.textContent : ''}</div>
                </div>
            `;
        }
    });
    
    return html;
}

// New conversation button
function startNewConversation() {
    if (confirm('Start a new conversation? Your current chat will be saved to history.')) {
        currentConversationId = null;
        localStorage.removeItem('currentConversationId');
        
        // Clear chat
        document.getElementById('chatMessages').innerHTML = '';
        
        // Hide print button container
        const printContainer = document.getElementById('printButtonContainer');
        if (printContainer) {
            printContainer.classList.remove('active');
        }
        
        // Show welcome message
        displayWelcomeMessage();
    }
}

console.log('🌿 Tree of Life AI initialized with print and personalization features');
