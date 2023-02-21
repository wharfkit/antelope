import {Serializer} from '../serializer'
import {P2PErrorHandler, P2PHandler, P2PProvider} from './provider'
import {NetMessage, TimeMessage} from './types'

type SetTimeout = (handler: any, timeout: number, ...args: any[]) => number
type TimeoutID = ReturnType<SetTimeout>

export interface P2PClientOptions {
    /** P2P provider to use  */
    provider: P2PProvider

    /** heartbeat timout in milliseconds, or undefined if no heartbeat is desired */
    heartbeatTimoutMs?: number

    /** alternative implementation for setTimeout (mostly for testing) */
    setTimeoutImpl?: SetTimeout
}

/**
 * @argument message a decoded message from the lower transport layer
 */
export type P2PMessageHandler = (message: NetMessage) => void

type P2PClientEventMap = {
    message: P2PMessageHandler
    error: P2PErrorHandler
    close: P2PHandler
}

export class P2PClient {
    static __className = 'P2PClient'

    readonly provider: P2PProvider

    private setTimeoutImpl: SetTimeout
    private heartbeatTimoutMs?: number
    private heartbeatTimoutId?: TimeoutID
    private eventListeners: {
        [T in keyof P2PClientEventMap]?: Array<{
            once: boolean
            handler: P2PClientEventMap[T]
        }>
    }

    constructor(options: P2PClientOptions) {
        if (options.provider) {
            this.provider = options.provider
        } else {
            throw new Error('Missing provider')
        }

        if (options.setTimeoutImpl !== undefined) {
            this.setTimeoutImpl = options.setTimeoutImpl
        } else {
            this.setTimeoutImpl = setTimeout
        }

        if (options.heartbeatTimoutMs !== undefined) {
            this.heartbeatTimoutMs = options.heartbeatTimoutMs
            this.resetHeartbeat()
        }

        this.provider.on('data', (data: Uint8Array) => {
            this.handleData(data)
        })

        this.provider.on('error', (e: any) => {
            this.emit('error', [e])
        })

        this.provider.on('close', () => {
            this.emit('close', [])
        })

        this.eventListeners = {}
    }

    send(message: NetMessage['value'], done?: P2PHandler): void {
        const wrappedMessage = NetMessage.from(message)
        const messageBuffer = Serializer.encode({object: wrappedMessage})
        this.provider.write(messageBuffer.array, done)
    }

    end(cb?: P2PHandler): void {
        this.endHeartbeat()
        this.provider.end(cb)
    }

    destroy(err?: Error): void {
        this.endHeartbeat()
        this.provider.destroy(err)
    }

    private handleData(data: Uint8Array): void {
        try {
            const message = Serializer.decode({type: NetMessage, data})
            this.emit('message', [message])
        } catch (e: any) {
            this.emit('error', [e])
        }
    }

    private endHeartbeat() {
        if (this.heartbeatTimoutId !== undefined) {
            clearTimeout(this.heartbeatTimoutId)
            this.heartbeatTimoutId = undefined
        }
    }

    private resetHeartbeat() {
        this.endHeartbeat()

        if (this.heartbeatTimoutMs !== undefined) {
            this.setTimeoutImpl(() => {
                this.handleHeartbeat()
            }, this.heartbeatTimoutMs)
        }
    }

    private handleHeartbeat() {
        const now = Date.now()
        const timeMessage = TimeMessage.from({
            org: now,
            rec: 0,
            xmt: 0,
            dst: 0,
        })

        this.send(timeMessage, () => {
            this.resetHeartbeat()
        })
    }

    on<T extends keyof P2PClientEventMap>(event: T, handler: P2PClientEventMap[T]): this {
        return this.addListenerInternal(event, handler, false, false)
    }
    once<T extends keyof P2PClientEventMap>(event: T, handler: P2PClientEventMap[T]): this {
        return this.addListenerInternal(event, handler, true, false)
    }
    addListener<T extends keyof P2PClientEventMap>(event: T, handler: P2PClientEventMap[T]): this {
        return this.addListenerInternal(event, handler, false, false)
    }
    prependListener<T extends keyof P2PClientEventMap>(
        event: T,
        handler: P2PClientEventMap[T]
    ): this {
        return this.addListenerInternal(event, handler, false, true)
    }
    removeListener<T extends keyof P2PClientEventMap>(
        event: T,
        handler: P2PClientEventMap[T]
    ): this {
        if (this.eventListeners[event] !== undefined) {
            this.eventListeners[event] = this.eventListeners[event]!.filter((e) => {
                return e.handler !== handler
            }) as (typeof this.eventListeners)[T]
        }

        return this
    }

    private addListenerInternal<T extends keyof P2PClientEventMap>(
        event: T,
        handler: P2PClientEventMap[T],
        once: boolean,
        prepend: boolean
    ): this {
        if (this.eventListeners[event] === undefined) {
            this.eventListeners[event] = []
        }

        if (!prepend) {
            this.eventListeners[event]!.push({once, handler})
        } else {
            this.eventListeners[event]!.unshift({once, handler})
        }

        return this
    }

    private emit<T extends keyof P2PClientEventMap>(
        event: T,
        args: Parameters<P2PClientEventMap[T]>
    ) {
        if (this.eventListeners[event] === undefined) {
            return
        }

        for (const {handler} of this.eventListeners[event]!) {
            // typescript is loosing the specificity provided by T in the assignment above
            const erasedHandler = handler as any
            erasedHandler(...args)
        }

        this.eventListeners[event] = this.eventListeners[event]!.filter((e) => {
            return e.once !== true
        }) as (typeof this.eventListeners)[T]
    }
}
