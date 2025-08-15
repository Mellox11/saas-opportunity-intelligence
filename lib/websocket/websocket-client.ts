import { AppLogger, LogContext } from '@/lib/observability/logger'

// Helper function to wrap custom properties in metadata
const createLogContext = (baseContext: Omit<LogContext, 'metadata'>, metadata: Record<string, any>): LogContext => ({
  ...baseContext,
  metadata
})

/**
 * WebSocket event types
 */
export enum WebSocketEvent {
  COST_UPDATE = 'cost_update',
  ANALYSIS_STATUS = 'analysis_status',
  PROGRESS_UPDATE = 'progress_update',
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected'
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage<T = any> {
  event: WebSocketEvent
  data: T
  timestamp: string
  correlationId?: string
}

/**
 * WebSocket client configuration
 */
export interface WebSocketConfig {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

/**
 * WebSocket client for real-time updates
 */
export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectTimer?: NodeJS.Timeout
  private heartbeatTimer?: NodeJS.Timeout
  private listeners: Map<WebSocketEvent, Set<(data: any) => void>> = new Map()
  private isIntentionallyClosed = false
  
  constructor(private config: WebSocketConfig = {}) {
    this.config = {
      url: process.env.NEXT_PUBLIC_WS_URL || this.getDefaultWsUrl(),
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config
    }
  }
  
  /**
   * Get default WebSocket URL based on current location
   */
  private getDefaultWsUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:3001'
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws`
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(analysisId?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }
    
    this.isIntentionallyClosed = false
    const url = analysisId 
      ? `${this.config.url}?analysisId=${analysisId}`
      : this.config.url!
    
    try {
      this.ws = new WebSocket(url)
      
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      
    } catch (error) {
      AppLogger.error('Failed to create WebSocket connection', {
        service: 'websocket-client',
        operation: 'connect_error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }, error as Error)
      
      this.scheduleReconnect()
    }
  }
  
  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
    
    this.notifyListeners(WebSocketEvent.DISCONNECTED, { 
      reason: 'Client initiated disconnect' 
    })
  }
  
  /**
   * Send message to server
   */
  send<T>(event: WebSocketEvent, data: T): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      AppLogger.warn('Cannot send message, WebSocket not connected', createLogContext({
        service: 'websocket-client',
        operation: 'send_failed'
      }, { event }))
      return
    }
    
    const message: WebSocketMessage<T> = {
      event,
      data,
      timestamp: new Date().toISOString()
    }
    
    try {
      this.ws.send(JSON.stringify(message))
    } catch (error) {
      AppLogger.error('Failed to send WebSocket message', createLogContext({
        service: 'websocket-client',
        operation: 'send_error'
      }, { 
        event, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), error as Error)
    }
  }
  
  /**
   * Subscribe to WebSocket events
   */
  on<T>(event: WebSocketEvent, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    this.listeners.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.reconnectAttempts = 0
    
    AppLogger.info('WebSocket connected', createLogContext({
      service: 'websocket-client',
      operation: 'connected'
    }, { url: this.config.url }))
    
    this.startHeartbeat()
    this.notifyListeners(WebSocketEvent.CONNECTED, { 
      url: this.config.url 
    })
  }
  
  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      
      AppLogger.debug('WebSocket message received', createLogContext({
        service: 'websocket-client',
        operation: 'message_received'
      }, { event: message.event }))
      
      this.notifyListeners(message.event, message.data)
      
    } catch (error) {
      AppLogger.error('Failed to parse WebSocket message', createLogContext({
        service: 'websocket-client',
        operation: 'parse_error'
      }, { 
        data: event.data,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), error as Error)
    }
  }
  
  /**
   * Handle WebSocket error
   */
  private handleError(event: Event): void {
    AppLogger.error('WebSocket error occurred', {
      service: 'websocket-client',
      operation: 'websocket_error'
    })
    
    this.notifyListeners(WebSocketEvent.ERROR, { 
      message: 'WebSocket error occurred' 
    })
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    AppLogger.info('WebSocket disconnected', createLogContext({
      service: 'websocket-client',
      operation: 'disconnected'
    }, { 
      code: event.code,
      reason: event.reason
    }))
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
    
    this.notifyListeners(WebSocketEvent.DISCONNECTED, {
      code: event.code,
      reason: event.reason
    })
    
    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect()
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return
    
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      AppLogger.error('Max reconnection attempts reached', createLogContext({
        service: 'websocket-client',
        operation: 'reconnect_failed'
      }, { attempts: this.reconnectAttempts }))
      return
    }
    
    this.reconnectAttempts++
    
    AppLogger.info('Scheduling WebSocket reconnection', createLogContext({
      service: 'websocket-client',
      operation: 'reconnect_scheduled'
    }, { 
      attempt: this.reconnectAttempts,
      delay: this.config.reconnectInterval
    }))
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.config.reconnectInterval)
  }
  
  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ 
          type: 'ping',
          timestamp: new Date().toISOString()
        }))
      }
    }, this.config.heartbeatInterval)
  }
  
  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: WebSocketEvent, data: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          AppLogger.error('WebSocket listener error', createLogContext({
            service: 'websocket-client',
            operation: 'listener_error'
          }, { 
            event,
            error: error instanceof Error ? error.message : 'Unknown error'
          }), error as Error)
        }
      })
    }
  }
  
  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
  
  /**
   * Get connection state
   */
  getState(): string {
    if (!this.ws) return 'DISCONNECTED'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING'
      case WebSocket.OPEN: return 'CONNECTED'
      case WebSocket.CLOSING: return 'CLOSING'
      case WebSocket.CLOSED: return 'CLOSED'
      default: return 'UNKNOWN'
    }
  }
}

// Singleton instance for application-wide WebSocket
let wsClient: WebSocketClient | null = null

/**
 * Get or create WebSocket client instance
 */
export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient()
  }
  return wsClient
}

/**
 * Hook for using WebSocket in React components
 */
export function useWebSocket(analysisId?: string) {
  const client = getWebSocketClient()
  
  // Connect when component mounts
  if (typeof window !== 'undefined' && analysisId) {
    client.connect(analysisId)
  }
  
  return {
    client,
    send: client.send.bind(client),
    on: client.on.bind(client),
    disconnect: client.disconnect.bind(client),
    isConnected: client.isConnected.bind(client),
    getState: client.getState.bind(client)
  }
}