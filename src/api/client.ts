import {APIProvider, FetchProvider, FetchProviderOptions} from './provider'
import {ABISerializableConstructor, ABISerializableType} from '../serializer/serializable'
import {abiDecode} from '../serializer/decoder'
import {ChainAPI} from './v1/chain'
import {BuiltinTypes} from '../serializer/builtins'

export interface APIClientOptions extends FetchProviderOptions {
    /** URL to the API node to use, only used if the provider option is not set. */
    url?: string
    /** API provider to use, if omitted and the url option is set the default provider will be used.  */
    provider?: APIProvider
}

export interface APIErrorDetail {
    message: string
    file: string
    line_number: number
    method: string
}

export interface APIErrorData {
    code: number
    name: string
    what: string
    details: APIErrorDetail[]
}

export class APIError extends Error {
    static __className = 'APIError'

    static formatError(error: APIErrorData) {
        if (error.what === 'unspecified' && error.details && error.details.length > 0) {
            return error.details[0].message
        } else if (error.what && error.what.length > 0) {
            return error.what
        } else {
            return 'Unknown API error'
        }
    }

    constructor(public readonly path: string, public readonly error: APIErrorData) {
        super(`${APIError.formatError(error)} at ${path}`)
    }

    /** The nodeos error name, e.g. `tx_net_usage_exceeded` */
    get name() {
        return this.error.name || 'unspecified'
    }

    /** The nodeos error code, e.g. `3080002`. */
    get code() {
        return this.error.code || 0
    }

    /** List of exceptions, if any. */
    get details() {
        return this.error.details
    }
}

export class APIClient {
    static __className = 'APIClient'

    readonly provider: APIProvider

    constructor(options: APIClientOptions) {
        if (options.provider) {
            this.provider = options.provider
        } else if (options.url) {
            this.provider = new FetchProvider(options.url, options)
        } else {
            throw new Error('Missing url or provider')
        }
    }

    v1 = {
        chain: new ChainAPI(this),
    }

    async call<T extends ABISerializableConstructor>(args: {
        path: string
        params?: unknown
        responseType: T
    }): Promise<InstanceType<T>>
    async call<T extends keyof BuiltinTypes>(args: {
        path: string
        params?: unknown
        responseType: T
    }): Promise<BuiltinTypes[T]>
    async call<T = unknown>(args: {path: string; params?: unknown}): Promise<T>
    async call(args: {path: string; params?: unknown; responseType?: ABISerializableType}) {
        const response = (await this.provider.call(args.path, args.params)) as any
        if (response.error) {
            throw new APIError(args.path, response.error)
        }
        if (args.responseType) {
            return abiDecode({type: args.responseType, object: response})
        }
        return response
    }
}
