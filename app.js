// Tree of Life AI - Chat Interface
// ✅ UPDATED: Custom styled modals + Clean welcome message
// ✅ NO MORE WHITE ALERT BOXES!

const API_BASE = 'https://treeoflife-vn25.onrender.com';

let currentConversationId = null;
let authToken = localStorage.getItem('authToken');
let userName = localStorage.getItem('userName') || 'friend';

// ✅ Image handling
let pendingImage = null;

// ==============================================
// 🎨 CUSTOM MODAL SYSTEM (Replaces alert/confirm)
// ==============================================

function showCustomAlert(message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customModalOverlay');
        const content = document.getElementById('modalContent');
        const buttons = document.getElementById('modalButtons');
        
        content.textContent = message;
        
        buttons.innerHTML = '';
        const okBtn = document.createElement('button');
        okBtn.className = 'custom-modal-btn';
        okBtn.textContent = 'OK';
        okBtn.onclick = () => {
            overlay.classList.remove('active');
            resolve();
        };
        buttons.appendChild(okBtn);
        
        overlay.classList.add('active');
        
        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                resolve();
            }
        };
    });
}

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customModalOverlay');
        const content = document.getElementById('modalContent');
        const buttons = document.getElementById('modalButtons');
        
        content.textContent = message;
        
        buttons.innerHTML = '';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'custom-modal-btn cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            overlay.classList.remove('active');
            resolve(false);
        };
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'custom-modal-btn';
        confirmBtn.textContent = 'Confirm';
        confirmBtn.onclick = () => {
            overlay.classList.remove('active');
            resolve(true);
        };
        
        buttons.appendChild(cancelBtn);
        buttons.appendChild(confirmBtn);
        
        overlay.classList.add('active');
        
        // Close on overlay click = cancel
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                resolve(false);
            }
        };
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedConversationId = localStorage.getItem('currentConversationId');
    
    if (authToken && savedConversationId) {
        loadCurrentConversation();
    } else {
        displayWelcomeMessage();
    }
    
    setupEventListeners();
    setupImageInput();
});

function displayWelcomeMessage() {
    // ✅ CLEANED: Removed image recognition text
    const greeting = authToken ? `Hello ${userName}! 🌿` : `Welcome! 🌿`;
    
    const welcomeMessage = {
        role: 'assistant',
        content: `${greeting} I'm Tree of Life AI. I provide health guidance from 11 medical traditions: Western Medicine, Ayurveda, TCM, Herbal Medicine, Homeopathy, Chiropractic, Clinical Nutrition, Vibrational Healing, Fitness & Physical Therapy, Elder Care & Law, and Consciousness Mapping.

${authToken ? 'What health topic can I help you explore?' : 'Please log in to start a conversation.'}`,
        timestamp: new Date().toISOString()
    };
    
    displayMessage(welcomeMessage);
}

function handleAuthError() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('currentConversationId');
    
    displayMessage({
        role: 'assistant',
        content: '⚠️ Your session has expired. Redirecting you to the login page...',
        timestamp: new Date().toISOString()
    });
    
    setTimeout(() => {
        window.location.href = 'auth.html';
    }, 2000);
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('currentConversationId');
    
    window.location.href = 'auth.html';
}

function setupEventListeners() {
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    
    document.getElementById('userInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    const printBtn = document.getElementById('printChatBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printConversation);
    }
}

function setupImageInput() {
    const imageInput = document.getElementById('imageInput');
    
    if (imageInput) {
        imageInput.removeEventListener('change', handleImageSelect);
        imageInput.addEventListener('change', handleImageSelect);
        console.log('✅ Image input listener attached');
    } else {
        console.warn('⚠️ Image input element not found');
    }
}

// ✅ UPDATED: Using custom alerts instead of browser alerts
async function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        await showCustomAlert('⚠️ Image size must be less than 5MB. Please select a smaller image.');
        event.target.value = '';
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
        await showCustomAlert('⚠️ Please select an image file (JPG, PNG, GIF, WebP)');
        event.target.value = '';
        return;
    }

    // Supported formats
    const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedFormats.includes(file.type)) {
        await showCustomAlert('⚠️ Supported formats: JPG, PNG, GIF, WebP');
        event.target.value = '';
        return;
    }

    console.log(`📸 Image selected: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1];
        
        pendingImage = {
            type: file.type,
            data: base64Data,
            preview: e.target.result
        };

        const previewImg = document.getElementById('imagePreview');
        const previewContainer = document.getElementById('imagePreviewContainer');
        
        if (previewImg && previewContainer) {
            previewImg.src = e.target.result;
            previewContainer.classList.add('active');
        }
        
        console.log('✅ Image loaded and ready to send');
    };
    
    reader.onerror = async function(error) {
        console.error('❌ Error reading image:', error);
        await showCustomAlert('⚠️ Failed to read image file. Please try again.');
        event.target.value = '';
    };
    
    reader.readAsDataURL(file);
}

function removeImage() {
    pendingImage = null;
    
    const imageInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('imagePreviewContainer');
    
    if (imageInput) {
        imageInput.value = '';
    }
    
    if (previewContainer) {
        previewContainer.classList.remove('active');
    }
    
    console.log('🗑️ Image removed');
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message && !pendingImage) return;
    
    const messageText = message || "What do you see in this image?";
    const imageToDisplay = pendingImage ? { ...pendingImage } : null;
    
    input.value = '';
    
    displayMessage({
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
        image: imageToDisplay
    });
    
    showLoadingIndicator();
    
    try {
        if (!currentConversationId) {
            await createConversation(messageText, pendingImage);
        } else {
            await sendMessageToConversation(messageText, pendingImage);
        }
        
        removeImage();
        
    } catch (error) {
        console.error('Error sending message:', error);
        
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

async function createConversation(initialMessage, imageData = null) {
    const requestBody = {
        initial_message: initialMessage
    };
    
    if (imageData) {
        requestBody.image = {
            type: imageData.type,
            data: imageData.data
        };
        console.log(`📸 Creating new conversation with image: ${imageData.type}`);
    }
    
    const response = await fetch(`${API_BASE}/api/chat/conversations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
    });
    
    if (response.status === 401) {
        handleAuthError();
        throw new Error('Authentication required');
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create conversation');
    }
    
    const data = await response.json();
    
    currentConversationId = data.conversation.id;
    localStorage.setItem('currentConversationId', currentConversationId);
    
    const aiMessage = data.messages.find(msg => msg.role === 'assistant');
    if (aiMessage) {
        displayMessage({
            role: 'assistant',
            content: aiMessage.content,
            timestamp: data.conversation.created_at
        });
    }
    
    showPrintButton();
}

async function sendMessageToConversation(message, imageData = null) {
    const requestBody = {
        message: message
    };
    
    if (imageData) {
        requestBody.image = {
            type: imageData.type,
            data: imageData.data
        };
        console.log(`📸 Sending message with image: ${imageData.type}`);
    }
    
    const response = await fetch(`${API_BASE}/api/chat/conversations/${currentConversationId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
    });
    
    if (response.status === 401) {
        handleAuthError();
        throw new Error('Authentication required');
    }
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send message');
    }
    
    const data = await response.json();
    
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
        
        if (response.status === 401) {
            handleAuthError();
            return;
        }
        
        if (!response.ok) {
            console.error('❌ Failed to load conversation, status:', response.status);
            localStorage.removeItem('currentConversationId');
            return;
        }
        
        const data = await response.json();
        console.log('✅ Loaded conversation:', data);
        console.log('📊 Messages found:', data.messages.length);
        
        currentConversationId = savedConversationId;
        
        if (data.messages && data.messages.length > 0) {
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
            
            data.messages.forEach(msg => {
                displayMessage(msg);
            });
        }
        
        console.log(`💬 Displayed ${data.messages.length} messages`);
        
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
    
    let messageHTML = '<div class="message-content">';
    
    if (message.image && message.image.preview) {
        messageHTML += `
            <img src="${message.image.preview}" 
                 class="message-image" 
                 alt="Uploaded image">
        `;
    }
    
    messageHTML += `
        <div class="message-text">${formatMessageContent(message.content)}</div>
        <div class="message-time">${time}</div>
    `;
    
    messageHTML += '</div>';
    
    messageDiv.innerHTML = messageHTML;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (typeof updatePrintButton === 'function') {
        updatePrintButton();
    }
}

function formatMessageContent(content) {
    let formatted = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    
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
    const printContainer = document.getElementById('printButtonContainer');
    if (printContainer) {
        printContainer.classList.add('active');
    }
}

// ==========================================
// PRINT FUNCTIONALITY
// ==========================================

// ✅ UPDATED: Using custom alert instead of browser alert
async function printConversation() {
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatMessages || chatMessages.children.length === 0) {
        await showCustomAlert('No messages to print!');
        return;
    }
    
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
                
                .message-image {
                    max-width: 300px;
                    max-height: 300px;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    display: block;
                    page-break-inside: avoid;
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
                    
                    .message-image {
                        max-width: 250px;
                        max-height: 250px;
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
        if (msgElement.classList.contains('loading-message')) return;
        
        const isUser = msgElement.classList.contains('user');
        const role = isUser ? 'You' : 'Tree of Life AI';
        const textElement = msgElement.querySelector('.message-text');
        const timeElement = msgElement.querySelector('.message-time');
        const imageElement = msgElement.querySelector('.message-image');
        
        if (textElement) {
            html += `
                <div class="message ${isUser ? 'user' : 'assistant'}">
                    <div class="message-role">${role}</div>
            `;
            
            if (imageElement) {
                html += `<img src="${imageElement.src}" class="message-image" alt="Message image">`;
            }
            
            html += `
                    <div class="message-text">${textElement.innerHTML}</div>
                    <div class="message-time">${timeElement ? timeElement.textContent : ''}</div>
                </div>
            `;
        }
    });
    
    return html;
}

function printChat() {
    printConversation();
}

// ✅ UPDATED: Using custom confirm instead of browser confirm
async function startNewConversation() {
    const confirmed = await showCustomConfirm('Start a new conversation? Your current chat will be saved to history.');
    
    if (confirmed) {
        currentConversationId = null;
        localStorage.removeItem('currentConversationId');
        
        document.getElementById('chatMessages').innerHTML = '';
        
        removeImage();
        
        const printContainer = document.getElementById('printButtonContainer');
        if (printContainer) {
            printContainer.classList.remove('active');
        }
        
        displayWelcomeMessage();
    }
}

console.log('🌿 Tree of Life AI initialized with custom modals! 🎨');
