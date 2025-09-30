class ChatCubeClient {
    constructor() {
        this.ws = null;
        this.username = '';
        this.userId = '';
        this.currentRoom = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.elements = {
            // Форма подключения
            usernameInput: document.getElementById('usernameInput'),
            connectBtn: document.getElementById('connectBtn'),
            
            // Комнаты
            newRoomInput: document.getElementById('newRoomInput'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            roomsList: document.getElementById('roomsList'),
            currentRoom: document.getElementById('currentRoom'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            
            // Чат
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            clearChatBtn: document.getElementById('clearChatBtn'),
            
            // Пользователи
            usersList: document.getElementById('usersList'),
            onlineCount: document.getElementById('onlineCount'),
            roomUsers: document.getElementById('roomUsers'),
            
            // Статус
            connectionStatus: document.getElementById('connectionStatus'),
            
            // Модальное окно
            modal: document.getElementById('notificationModal'),
            modalTitle: document.getElementById('modalTitle'),
            modalMessage: document.getElementById('modalMessage'),
            modalCloseBtn: document.getElementById('modalCloseBtn')
        };
    }

    bindEvents() {
        // Подключение
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connect();
        });

        // Комнаты
        this.elements.createRoomBtn.addEventListener('click', () => this.createRoom());
        this.elements.newRoomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createRoom();
        });
        this.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());

        // Сообщения
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.elements.clearChatBtn.addEventListener('click', () => this.clearChat());

        // Модальное окно
        this.elements.modalCloseBtn.addEventListener('click', () => this.hideModal());
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.hideModal();
        });

        window.addEventListener('beforeunload', () => this.disconnect());
    }

    connect() {
        const username = this.elements.usernameInput.value.trim();
        
        if (!username) {
            this.showNotification('Ошибка', 'Введите имя пользователя');
            return;
        }

        if (username.length < 2 || username.length > 20) {
            this.showNotification('Ошибка', 'Имя должно быть от 2 до 20 символов');
            return;
        }

        this.username = username;
        
        try {
            this.ws = new WebSocket('ws://localhost:8080/ws');
            
            this.ws.onopen = () => this.onWebSocketOpen();
            this.ws.onmessage = (event) => this.onWebSocketMessage(event);
            this.ws.onclose = () => this.onWebSocketClose();
            this.ws.onerror = (error) => this.onWebSocketError(error);
            
        } catch (error) {
            this.showNotification('Ошибка', `Не удалось подключиться: ${error.message}`);
        }
    }

    // WebSocket события
    onWebSocketOpen() {
        console.log('WebSocket подключен');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus(true);
        
        // Отправляем запрос на подключение пользователя
        this.sendWebSocketMessage({
            type: 'user_connect',
            data: {
                username: this.username
            }
        });
    }

    onWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            this.handleServerMessage(message);
        } catch (error) {
            console.error('Ошибка парсинга сообщения:', error);
        }
    }

    onWebSocketClose() {
        console.log('WebSocket отключен');
        this.isConnected = false;
        this.updateConnectionStatus(false);
        this.disableChat();
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                this.connect();
            }, 3000);
        }
    }

    onWebSocketError(error) {
        console.error('WebSocket ошибка:', error);
        this.showNotification('Ошибка', 'Ошибка соединения с сервером');
    }

    handleServerMessage(message) {
        console.log('Получено сообщение:', message);
        
        switch (message.type) {
            case 'user_connected':
                this.handleUserConnected(message.data);
                break;
                
            case 'room_created':
                this.handleRoomCreated(message.data);
                break;
                
            case 'room_joined':
                this.handleRoomJoined(message.data);
                break;
                
            case 'message_receive':
                this.handleMessageReceived(message.data);
                break;
                
            case 'rooms_list':
                this.handleRoomsList(message.data);
                break;
                
            case 'room_users':
                this.handleRoomUsers(message.data);
                break;
                
            case 'users_online_update':
                this.handleUsersOnlineUpdate(message.data);
                break;
                
            case 'system_message':
                this.handleSystemMessage(message.data);
                break;
                
            case 'error':
                this.handleError(message.data);
                break;
                
            case 'pong':
                // Ответ на ping, можно обновить время последней активности
                break;
                
            default:
                console.warn('Неизвестный тип сообщения:', message.type);
        }
    }

    handleUserConnected(data) {
        this.userId = data.user_id;
        this.showNotification('Успех', `Добро пожаловать, ${this.username}!`);
        this.enableChat();
        this.loadRoomsList();
        this.loadOnlineUsers();
    }

    handleRoomCreated(data) {
        this.showNotification('Успех', `Комната "${data.room_name}" создана`);
        this.joinRoom(data.room_id);
        this.loadRoomsList();
    }

    handleRoomJoined(data) {
        this.currentRoom = data.room_id;
        this.elements.currentRoom.textContent = data.room_name;
        this.elements.roomUsers.textContent = `${data.users_count} пользователей`;
        
        if (data.message_history && data.message_history.length > 0) {
            this.displayMessageHistory(data.message_history);
        } else {
            this.addSystemMessage(`Вы присоединились к комнате "${data.room_name}"`);
        }
        
        this.enableMessageInput();
        this.updateRoomSelection(data.room_id);
        this.loadRoomUsers(data.room_id);
    }

    handleMessageReceived(data) {
        this.addMessage({
            username: data.username,
            text: data.text,
            timestamp: data.timestamp,
            isOwn: data.username === this.username
        });
    }

    handleRoomsList(data) {
        this.displayRoomsList(data.rooms);
    }

    handleRoomUsers(data) {
        this.displayRoomUsers(data.users);
    }

    handleUsersOnlineUpdate(data) {
        this.displayOnlineUsers(data.users, data.total_online);
    }

    handleSystemMessage(data) {
        this.addSystemMessage(data.text);
    }

    handleError(data) {
        this.showNotification('Ошибка', data.message);
    }

    sendWebSocketMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const fullMessage = {
                ...message,
                timestamp: new Date().toISOString()
            };
            this.ws.send(JSON.stringify(fullMessage));
        } else {
            this.showNotification('Ошибка', 'Нет соединения с сервером');
        }
    }

    createRoom() {
        const roomName = this.elements.newRoomInput.value.trim();
        
        if (!roomName) {
            this.showNotification('Ошибка', 'Введите название комнаты');
            return;
        }

        if (roomName.length < 2 || roomName.length > 30) {
            this.showNotification('Ошибка', 'Название комнаты должно быть от 2 до 30 символов');
            return;
        }

        this.sendWebSocketMessage({
            type: 'room_create',
            data: {
                room_name: roomName,
                created_by: this.username
            }
        });

        this.elements.newRoomInput.value = '';
    }

    joinRoom(roomId) {
        this.sendWebSocketMessage({
            type: 'room_join',
            data: {
                room_id: roomId,
                username: this.username
            }
        });
    }

    leaveRoom() {
        if (!this.currentRoom) return;

        this.sendWebSocketMessage({
            type: 'room_leave',
            data: {
                room_id: this.currentRoom,
                username: this.username
            }
        });

        this.currentRoom = null;
        this.elements.currentRoom.textContent = 'Выберите комнату';
        this.elements.roomUsers.textContent = '0 пользователей';
        this.disableMessageInput();
        this.clearMessages();
        this.updateRoomSelection(null);
    }

    sendMessage() {
        const text = this.elements.messageInput.value.trim();
        
        if (!text) return;
        
        if (!this.currentRoom) {
            this.showNotification('Ошибка', 'Выберите комнату для отправки сообщения');
            return;
        }

        const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.sendWebSocketMessage({
            type: 'message_send',
            data: {
                room_id: this.currentRoom,
                username: this.username,
                text: text,
                message_id: messageId
            }
        });

        this.elements.messageInput.value = '';
    }

    loadRoomsList() {
        this.sendWebSocketMessage({
            type: 'rooms_list',
            data: {}
        });
    }

    loadOnlineUsers() {
        // Сервер автоматически отправляет обновления
    }

    loadRoomUsers(roomId) {
        // Сервер автоматически отправляет при присоединении
    }

    displayRoomsList(rooms) {
        const roomsList = this.elements.roomsList;
        roomsList.innerHTML = '';

        if (!rooms || rooms.length === 0) {
            roomsList.innerHTML = '<div class="room-item">Комнат нет</div>';
            return;
        }

        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                <div class="room-name">${this.escapeHtml(room.room_name)}</div>
                <div class="room-info">👥 ${room.users_count} • ${this.formatDate(room.created_at)}</div>
            `;
            
            roomElement.addEventListener('click', () => this.joinRoom(room.room_id));
            roomsList.appendChild(roomElement);
        });
    }

    displayRoomUsers(users) {
        const usersList = this.elements.usersList;
        usersList.innerHTML = '';

        if (!users || users.length === 0) {
            usersList.innerHTML = '<div class="user-item">Нет пользователей</div>';
            return;
        }

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-status"></div>
                <div class="user-name">${this.escapeHtml(user.username)}</div>
            `;
            usersList.appendChild(userElement);
        });
    }

    displayOnlineUsers(users, total) {
        this.elements.onlineCount.textContent = total;
        
        const usersList = document.createElement('div');
        users.forEach(username => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-status"></div>
                <div class="user-name">${this.escapeHtml(username)}</div>
            `;
            usersList.appendChild(userElement);
        });
        
        const onlineUsersList = document.getElementById('onlineUsersList');
        if (onlineUsersList) {
            onlineUsersList.innerHTML = usersList.innerHTML;
        }
    }

    displayMessageHistory(messages) {
        messages.forEach(message => {
            this.addMessage({
                username: message.username,
                text: message.text,
                timestamp: message.timestamp,
                isOwn: message.username === this.username
            });
        });
    }

    addMessage(messageData) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${messageData.isOwn ? 'own' : 'other'}`;
        
        const time = this.formatTime(messageData.timestamp);
        
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>${this.escapeHtml(messageData.username)}</strong>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${this.escapeHtml(messageData.text)}</div>
        `;
        
        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    addSystemMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <div class="message-text">${this.escapeHtml(text)}</div>
        `;
        
        this.elements.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    clearMessages() {
        this.elements.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h3>Добро пожаловать в ChatCube! 🚀</h3>
                <p>Выберите комнату слева чтобы начать общение</p>
            </div>
        `;
    }

    clearChat() {
        if (this.currentRoom) {
            this.elements.messagesContainer.innerHTML = '';
            this.addSystemMessage('История чата очищена');
        }
    }

    updateConnectionStatus(connected) {
        const status = this.elements.connectionStatus;
        status.textContent = connected ? 'Подключено' : 'Не подключено';
        status.className = connected ? 'connection-status connected' : 'connection-status disconnected';
    }

    updateRoomSelection(roomId) {
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.roomId === roomId) {
                item.classList.add('active');
            }
        });
    }

    enableChat() {
        this.elements.connectBtn.disabled = true;
        this.elements.usernameInput.disabled = true;
        this.elements.createRoomBtn.disabled = false;
        this.elements.newRoomInput.disabled = false;
    }

    disableChat() {
        this.elements.connectBtn.disabled = false;
        this.elements.usernameInput.disabled = false;
        this.elements.createRoomBtn.disabled = true;
        this.elements.newRoomInput.disabled = true;
        this.disableMessageInput();
    }

    enableMessageInput() {
        this.elements.messageInput.disabled = false;
        this.elements.sendBtn.disabled = false;
        this.elements.messageInput.focus();
    }

    disableMessageInput() {
        this.elements.messageInput.disabled = true;
        this.elements.sendBtn.disabled = true;
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    showNotification(title, message) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalMessage.textContent = message;
        this.elements.modal.style.display = 'block';
    }

    hideModal() {
        this.elements.modal.style.display = 'none';
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.chatClient = new ChatCubeClient();
});

setInterval(() => {
    if (window.chatClient && window.chatClient.isConnected) {
        window.chatClient.sendWebSocketMessage({
            type: 'ping',
            data: {}
        });
    }
}, 30000);