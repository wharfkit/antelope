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
    write(encodedMessage: Buffer, done?: P2PHandler): void
    end(cb?: P2PHandler): void
    destroy(err?: Error): void

    on<T extends keyof P2PEventMap>(event: T, handler: P2PEventMap[T]): this
    //removeListener<T extends keyof P2PEventMap>(event: T, handler: P2PEventMap[T]): this
}

export class SimpleEnvelopeP2PProvider {
    static maxReadLength = 8 * 1024 * 1024
    private declare nextProvider: P2PProvider
    private declare dataHandlers: Array<P2PDataHandler>
    private declare errorHandlers: Array<P2PErrorHandler>
    private declare remainingData: Buffer

    constructor(nextProvider: P2PProvider) {
        this.nextProvider = nextProvider
        this.remainingData = Buffer.allocUnsafe(0)
        this.dataHandlers = []
        this.errorHandlers = []

        // process nextProvider data
        this.nextProvider.on('data', (data: Buffer) => {
            this.remainingData = Buffer.concat([this.remainingData, data])
            while (this.remainingData.byteLength >= 4) {
                const messageLength = this.remainingData.readUInt32LE(0)
                if (messageLength > SimpleEnvelopeP2PProvider.maxReadLength) {
                    this.emitError(new Error('Incoming Message too long'))
                }

                if (this.remainingData.byteLength < 4 + messageLength) {
                    // need more data
                    break
                }

                const messageBuffer = this.remainingData.subarray(4, 4 + messageLength)
                this.remainingData = Buffer.from(
                    Uint8Array.prototype.slice.call(this.remainingData, 4 + messageLength)
                )
                this.emitData(messageBuffer)
            }
        })

        // proxy error
        this.nextProvider.on('error', (err: any) => {
            this.emitError(err)
        })
    }

    write(data: Buffer, done?: P2PHandler): void {
        const nextBuffer = Buffer.allocUnsafe(4 + data.byteLength)
        nextBuffer.writeUInt32LE(data.byteLength, 0)
        nextBuffer.set(data, 4)
        this.nextProvider.write(nextBuffer, done)
    }

    end(cb?: P2PHandler): void {
        this.nextProvider.end(cb)
    }

    destroy(err?: Error): void {
        this.nextProvider.destroy(err)
    }

    on<T extends keyof P2PEventMap>(event: T, handler: P2PEventMap[T]): this {
        if (event === 'data') {
            this.dataHandlers.push(handler)
        } else if (event === 'error') {
            this.errorHandlers.push(handler)
        } else {
            this.nextProvider.on(event, handler)
        }
        return this
    }

    emitData(messageBuffer: Buffer): void {
        for (const handler of this.dataHandlers) {
            // typescript is loosing the specificity provided by T in the assignment above
            handler(messageBuffer)
        }
    }

    emitError(err: any): void {
        for (const handler of this.errorHandlers) {
            // typescript is loosing the specificity provided by T in the assignment above
            handler(err)
        }
    }
}
