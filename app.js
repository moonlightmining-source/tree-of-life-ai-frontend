// Tree of Life AI - Chat Interface
// Updated with: Print Button + Personalized AI addressing + IMAGE RECOGNITION
// 🔧 FIXED: Backend request format and response handling
// 📸 NEW: Full image upload and analysis support
// ✅ FIXED: Event listener setup (no duplicate triggers)

const API_BASE = 'https://treeoflife-vn25.onrender.com';

let currentConversationId = null;
let authToken = localStorage.getItem('token');
let userName = localStorage.getItem('userName') || 'friend'; // Get user's first name

// ✅ Image handling (declared only ONCE here in app.js)
let pendingImage = null;

// Track selected medical traditions
// Use window.selectedTraditions set by index.html
// Build system prompt based on selected traditions
function buildSystemPrompt() {
    const selectedTraditions = window.selectedTraditions || [];
    
    if (selectedTraditions.includes('all') || selectedTraditions.length === 0) {
        return null; // Use default Claude behavior
    }
    
    const traditionNames = {
        'western': 'Western Medicine',
        'ayurveda': 'Ayurveda',
        'tcm': 'Traditional Chinese Medicine',
        'herbal': 'Herbal Medicine',
        'naturopathy': 'Natureopathy',
        'chiropractic': 'Chiropractic',
        'nutrition': 'Clinical Nutrition',
        'functional': 'Functional medicine',
        'fitness': 'Fitness & Exercise',
        'physical therapy': 'Physical Therapy',
        
    };    
   
    const selected = selectedTraditions.map(t => traditionNames[t] || t);
    
    return `You are Tree of Life AI. The user has specifically selected these healing traditions: ${selected.join(', ')}. 

IMPORTANT: Respond PRIMARILY from these selected tradition(s). Focus your analysis, recommendations, and insights through the lens of ${selected.length === 1 ? 'this tradition' : 'these traditions'}. 

${selected.length > 1 ? 'You may briefly mention other perspectives for context, but your main response should center on the selected traditions.' : 'Stay focused on this single tradition unless the user asks for other perspectives.'}

Provide specific, actionable guidance from ${selected.length === 1 ? 'this tradition\'s' : 'these traditions\''} framework.`;
}
// ✨ CUSTOM MODAL FUNCTIONS - ADDED (replaces alert/confirm with styled modals)
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
    setupImageInput(); // ✅ ADDED: Setup image input event listener
});

function displayWelcomeMessage() {
    // Check if chatting as a family member
    const displayName = window.currentFamilyMember?.name || userName;
    
    // Show personalized greeting in chat
    const greeting = authToken ? `Hello ${displayName}! ` : `Welcome! `;
    
    const welcomeMessage = {
        role: 'assistant',
        content: `${greeting}🌿 I'm Tree of Life AI. I provide health guidance from 10 evidence-based modalities:

**Modern Medicine:**
- Western Medicine
- Functional Medicine  
- Clinical Nutrition
- Physical Therapy

**Traditional Systems:**
- Ayurveda
- Traditional Chinese Medicine
- Naturopathy

**Specialized Therapies:**
- Herbal Medicine
- Chiropractic
- Fitness & Exercise Science

${authToken ? 'What health topic can I help you explore?' : 'Please log in to start a conversation.'}`,
        timestamp: new Date().toISOString()
    };
    
    displayMessage(welcomeMessage);
}

function handleAuthError() {
    // Clear invalid auth data
    localStorage.removeItem('token');
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
    localStorage.removeItem('token');
    localStorage.removeItem('authToken'); 
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('currentConversationId');
    
    // Redirect to login
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

// ✅ ADDED: Setup image input event listener (prevents duplicate triggers)
function setupImageInput() {
    const imageInput = document.getElementById('imageInput');
    
    if (imageInput) {
        // Remove any existing listener to prevent duplicates
        imageInput.removeEventListener('change', handleImageSelect);
        
        // Add the event listener
        imageInput.addEventListener('change', handleImageSelect);
        
        console.log('✅ Image input listener attached');
    } else {
        console.warn('⚠️ Image input element not found');
    }
}

// ✅ Handle image selection
async function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        await showCustomAlert('⚠️ Image size must be less than 5MB. Please select a smaller image.');
        event.target.value = ''; // Clear the input
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

    // Read file and convert to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result.split(',')[1];
        
        // Store image data
        pendingImage = {
            type: file.type,
            data: base64Data,
            preview: e.target.result
        };

        // Show preview
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

// ✅ Remove selected image
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

// ✅ UPDATED: Send message with optional image
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    // Allow sending if there's either a message OR an image
    if (!message && !pendingImage) return;
    
    // If only image, use default message
    const messageText = message || "What do you see in this image?";
    
    // Store image reference for display
    const imageToDisplay = pendingImage ? { ...pendingImage } : null;
    
    // Clear input
    input.value = '';
    
    // Display user message immediately (with image if present)
    displayMessage({
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
        image: imageToDisplay  // ✅ Include image for display
    });
    
    // Show loading indicator
    showLoadingIndicator();
    
    try {
        if (!currentConversationId) {
            // Create new conversation with message and optional image
            await createConversation(messageText, pendingImage);
        } else {
            // Send message to existing conversation with optional image
            await sendMessageToConversation(messageText, pendingImage);
        }
        
        // ✅ Clear the pending image after successful send
        removeImage();
        
   } catch (error) {
        console.error('❌ Full error object:', error);
        
        // Extract readable error message
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        if (error.message && error.message !== '[object Object]') {
            errorMessage = error.message;
        } else if (error.detail) {
            errorMessage = error.detail;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        console.error('📋 Error message:', errorMessage);
        
        // Don't show error if it's auth error (already handled)
        if (errorMessage !== 'Authentication required') {
            displayMessage({
                role: 'assistant',
                content: `❌ ${errorMessage}`,
                timestamp: new Date().toISOString()
            });
        }
    } finally {
        hideLoadingIndicator();
    }
}

// ✅ UPDATED: Create conversation with optional image and member context
async function createConversation(initialMessage, imageData = null) {
    // Build system prompt based on selected traditions
    let systemPrompt = buildSystemPrompt();
    
    // Add member context to system prompt
    if (window.currentFamilyMember?.name) {
        const memberContext = `\n\nIMPORTANT: You are currently chatting with ${window.currentFamilyMember.name}, a family member. Address them by name and provide guidance specifically for them, not the account owner.`;
        systemPrompt = systemPrompt ? systemPrompt + memberContext : memberContext.trim();
    }
    
    // Build request body with optional image and system prompt
    const requestBody = {
        initial_message: systemPrompt 
            ? `${systemPrompt}\n\nUser question: ${initialMessage}`
            : initialMessage,
        member_id: window.currentFamilyMember?.id ? parseInt(window.currentFamilyMember.id) : null,
        member_name: window.currentFamilyMember?.name || null
    };

    
    console.log('👤 Creating conversation with member context:', window.currentFamilyMember);
    
    // Add image if present
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
    
    // Backend returns conversation and messages directly
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

// ✅ UPDATED: Send message to conversation with optional image and member context
async function sendMessageToConversation(message, imageData = null) {
    // Build system prompt based on selected traditions
    let systemPrompt = buildSystemPrompt();
    
    // Add member context to system prompt
    if (window.currentFamilyMember?.name) {
        const memberContext = `\n\nIMPORTANT: You are currently chatting with ${window.currentFamilyMember.name}, a family member. Address them by name and provide guidance specifically for them, not the account owner.`;
        systemPrompt = systemPrompt ? systemPrompt + memberContext : memberContext.trim();
    }
    
   // Build request body with optional image and system prompt
    const requestBody = {
        message: systemPrompt 
            ? `${systemPrompt}\n\nUser question: ${message}`
            : message,
        member_id: window.currentFamilyMember?.id ? parseInt(window.currentFamilyMember.id) : null,
        member_name: window.currentFamilyMember?.name || null
    };
    
    console.log('👤 Sending message with member context:', window.currentFamilyMember);
    
    // Add image if present
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
    
    // Handle authentication errors
    if (response.status === 401) {
        handleAuthError();
        throw new Error('Authentication required');
    }
    
   if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Backend error response:', errorData);
        
        // Extract error message
        let errorMsg = 'Failed to send message';
        if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
                errorMsg = errorData.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
            } else {
                errorMsg = errorData.detail;
            }
        }
        
        throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    // Backend returns message directly in data.message
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

// ✅ UPDATED: Display message with optional image
function displayMessage(message) {
    const chatMessages = document.getElementById('chatMessages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;
    
    const time = new Date(message.timestamp || message.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Build message HTML with optional image
    let messageHTML = '<div class="message-content">';
    
    // Add image if present
    if (message.image && message.image.preview) {
        messageHTML += `
            <img src="${message.image.preview}" 
                 class="message-image" 
                 alt="Uploaded image">
        `;
    }
    
    // Add text content
    messageHTML += `
        <div class="message-text">${formatMessageContent(message.content)}</div>
        <div class="message-time">${time}</div>
    `;
    
    messageHTML += '</div>';
    
    messageDiv.innerHTML = messageHTML;
    
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
// PRINT FUNCTIONALITY (UPDATED FOR IMAGES)
// ==========================================

async function printConversation() {
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatMessages || chatMessages.children.length === 0) {
        await showCustomAlert('No messages to print!');
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
    
    // Wait for images to load, then print
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };
}

// ✅ UPDATED: Get messages for print with images
function getMessagesForPrint() {
    const chatMessages = document.getElementById('chatMessages');
    let html = '';
    
    Array.from(chatMessages.children).forEach(msgElement => {
        if (msgElement.classList.contains('loading-message')) return; // Skip loading indicator
        
        const isUser = msgElement.classList.contains('user');
        const role = isUser ? 'You' : 'Tree of Life AI';
        const textElement = msgElement.querySelector('.message-text');
        const timeElement = msgElement.querySelector('.message-time');
        const imageElement = msgElement.querySelector('.message-image');  // ✅ Get image if present
        
        if (textElement) {
            html += `
                <div class="message ${isUser ? 'user' : 'assistant'}">
                    <div class="message-role">${role}</div>
            `;
            
            // ✅ Include image in print if present
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

// ✅ ADDED: Print chat wrapper (called by print button in index.html)
function printChat() {
    printConversation();
}

// New conversation button
async function startNewConversation() {
    const confirmed = await showCustomConfirm('Start a new conversation? Your current chat will be saved to history.');
    if (confirmed) {
        currentConversationId = null;
        localStorage.removeItem('currentConversationId');
        
        // Clear family member selection when starting new chat as owner
        localStorage.removeItem('selectedMemberId');
        localStorage.removeItem('selectedMemberName');
        window.currentFamilyMember = null;
        
        // Clear chat
        document.getElementById('chatMessages').innerHTML = '';
        
        // Clear any pending image
        removeImage();
        
        // Hide print button container
        const printContainer = document.getElementById('printButtonContainer');
        if (printContainer) {
            printContainer.classList.remove('active');
        }
        
        // Show welcome message
        displayWelcomeMessage();
    }
}

console.log('🌿 Tree of Life AI initialized with print, personalization, and IMAGE RECOGNITION! 📸');
console.log('✅ Image input event listener properly configured (no duplicates)');
