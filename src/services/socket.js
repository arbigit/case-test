import { io } from 'socket.io-client';

const SOCKET_URL = 'https://149.28.85.9:5000';

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.connectPromise = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
    }

    connect() {
        if (this.connectPromise) {
            return this.connectPromise;
        }

        if (this.socket?.connected) {
            return Promise.resolve(this.socket);
        }

        this.connectPromise = new Promise((resolve) => {
            console.log('Initiating socket connection...');

            this.socket = io(SOCKET_URL, {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: Infinity,
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                console.log('Socket connected successfully:', this.socket.id);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.connectPromise = null;

                // Send test ping
                this.socket.emit('ping');
                resolve(this.socket);
            });

            this.socket.on('connection_ack', (data) => {
                console.log('Server acknowledged connection:', data);
            });

            this.socket.on('pong', (data) => {
                console.log('Received pong from server:', data);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                this.isConnected = false;
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                this.reconnectAttempts++;
                console.log(`Reconnection attempt ${this.reconnectAttempts}`);
            });

            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
            });
        });

        return this.connectPromise;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connectPromise = null;
            this.isConnected = false;
            console.log('Socket disconnected manually');
        }
    }

    // Add event listener with automatic reconnection
    async on(event, callback) {
        await this.connect();

        console.log(`Registering listener for event: ${event}`);

        // Remove existing listener for this event if it exists
        if (this.listeners.has(event)) {
            console.log(`Removing existing listener for event: ${event}`);
            this.socket.off(event, this.listeners.get(event));
        }

        // Wrap the callback to include logging
        const wrappedCallback = (data) => {
            console.log(`Received ${event} event:`, data);
            callback(data);
        };

        this.socket.on(event, wrappedCallback);
        this.listeners.set(event, wrappedCallback);
    }

    // Remove event listener
    off(event) {
        if (this.socket && this.listeners.has(event)) {
            console.log(`Removing listener for event: ${event}`);
            this.socket.off(event, this.listeners.get(event));
            this.listeners.delete(event);
        }
    }

    // Clean up all listeners but maintain connection
    cleanup() {
        if (this.socket) {
            console.log('Cleaning up all listeners');
            this.listeners.forEach((callback, event) => {
                this.socket.off(event, callback);
            });
            this.listeners.clear();
        }
    }

    // Check connection status
    isSocketConnected() {
        return this.isConnected && this.socket?.connected;
    }
}

// Create a singleton instance
const socketService = new SocketService();
export { socketService }; 
