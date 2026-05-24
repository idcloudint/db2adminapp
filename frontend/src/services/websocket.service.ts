import { HealthSummary, WebSocketMessage } from '../types';

type HealthUpdateCallback = (health: HealthSummary) => void;
type ConnectionStatusCallback = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private healthUpdateCallbacks: HealthUpdateCallback[] = [];
  private connectionStatusCallbacks: ConnectionStatusCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000;

  connect(url: string = 'ws://localhost:3001/ws') {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket:', url);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.notifyConnectionStatus(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        if (message.type === 'health_update') {
          this.notifyHealthUpdate(message.payload);
        } else if (message.type === 'heartbeat') {
          console.log('Heartbeat received');
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.notifyConnectionStatus(false);
      this.attemptReconnect(url);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(url);
    }, delay);
  }

  onHealthUpdate(callback: HealthUpdateCallback) {
    this.healthUpdateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.healthUpdateCallbacks = this.healthUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectionStatus(callback: ConnectionStatusCallback) {
    this.connectionStatusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionStatusCallbacks = this.connectionStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyHealthUpdate(health: HealthSummary) {
    this.healthUpdateCallbacks.forEach(callback => {
      try {
        callback(health);
      } catch (error) {
        console.error('Error in health update callback:', error);
      }
    });
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionStatusCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection status callback:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();

// Made with Bob
