/**
 * @argument encodedMessage a complete message from the lower transport layer
 */
export type P2PDataHandler = (encodedMessage: Buffer) => void

export type P2PErrorHandler = (error: any) => void

export type P2PHandler = () => void

export type P2PEventMap = {
    data: P2PDataHandler
    error: P2PErrorHandler
    close: P2PHandler
}

/**
 * Provider interface for P2P protocol responsible for re-assembling full message payloads before
 * delivering them upstream via event emission
 */
export interface P2PProvider {
    send(encodedMessage: Buffer, done?: P2PHandler): void
    end(cb?: P2PHandler): void
    destroy(err?: Error): void

    on<T extends keyof P2PEventMap>(event: T, handler: P2PEventMap[T]): this
    //removeListener<T extends keyof P2PEventMap>(event: T, handler: P2PEventMap[T]): this
}
