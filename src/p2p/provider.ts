/**
 * @argument encodedMessage a complete message from the lower transport layer
 */
export type P2PDataHandler = (encodedMessage: Uint8Array) => void

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
    write(encodedMessage: Uint8Array, done?: P2PHandler): void
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
    private declare remainingData: Uint8Array

    constructor(nextProvider: P2PProvider) {
        this.nextProvider = nextProvider
        this.remainingData = new Uint8Array(0)
        this.dataHandlers = []
        this.errorHandlers = []

        // process nextProvider data
        this.nextProvider.on('data', (data: Uint8Array) => {
            const newData = new Uint8Array(this.remainingData.byteLength + data.byteLength)
            newData.set(this.remainingData, 0)
            newData.set(data, this.remainingData.byteLength)
            this.remainingData = newData
            while (this.remainingData.byteLength >= 4) {
                const view = new DataView(this.remainingData.buffer)
                const messageLength = view.getUint32(0, true)
                if (messageLength > SimpleEnvelopeP2PProvider.maxReadLength) {
                    this.emitError(new Error('Incoming Message too long'))
                }

                if (this.remainingData.byteLength < 4 + messageLength) {
                    // need more data
                    break
                }

                const messageBuffer = this.remainingData.subarray(4, 4 + messageLength)
                this.remainingData = this.remainingData.slice(4 + messageLength)
                this.emitData(messageBuffer)
            }
        })

        // proxy error
        this.nextProvider.on('error', (err: any) => {
            this.emitError(err)
        })
    }

    write(data: Uint8Array, done?: P2PHandler): void {
        const nextBuffer = new Uint8Array(4 + data.byteLength)
        const view = new DataView(nextBuffer.buffer)
        view.setUint32(0, data.byteLength, true)
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

    emitData(messageBuffer: Uint8Array): void {
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
