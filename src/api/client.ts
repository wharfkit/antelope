import {APIProvider, APIResponse, FetchProvider, FetchProviderOptions} from './provider'
import {ABISerializableConstructor, ABISerializableType} from '../serializer/serializable'
import {abiDecode} from '../serializer/decoder'
import {ChainAPI} from './v1/chain'
import {HistoryAPI} from './v1/history'
import {BuiltinTypes} from '../serializer/builtins'

export {ChainAPI, HistoryAPI}

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

export type APIMethods = 'POST' | 'GET'

export class APIError extends Error {
    static __className = 'APIError'

    static formatError(error: APIErrorData) {
        if (
            error.what === 'unspecified' &&
            error.details[0].file &&
            error.details[0].file === 'http_plugin.cpp' &&
            error.details[0].message.slice(0, 11) === 'unknown key'
        ) {
            // fix cryptic error messages from nodeos for missing accounts
            return 'Account not found'
        } else if (error.what === 'unspecified' && error.details && error.details.length > 0) {
            return error.details[0].message
        } else if (error.what && error.what.length > 0) {
            return error.what
        } else {
            return 'Unknown API error'
        }
    }

    /** The path to the API that failed, e.g. `/v1/chain/get_info`. */
    readonly path: string

    /** The full response from the API that failed. */
    readonly response: APIResponse

    constructor(path: string, response: APIResponse) {
        let message: string
        if (response.json && response.json.error) {
            message = `${APIError.formatError(response.json.error)} at ${path}`
        } else {
            message = `HTTP ${response.status} at ${path}`
        }
        super(message)
        this.path = path
        this.response = response
    }

    /** The nodeos error object. */
    get error() {
        const {json} = this.response
        return (json ? json.error : undefined) as APIErrorData | undefined
    }

    /** The nodeos error name, e.g. `tx_net_usage_exceeded` */
    get name() {
        const {error} = this
        return error ? error.name : 'unspecified'
    }

    /** The nodeos error code, e.g. `3080002`. */
    get code() {
        const {error} = this
        return error ? error.code : 0
    }

    /** List of exceptions, if any. */
    get details() {
        const {error} = this
        return error ? error.details : []
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
        history: new HistoryAPI(this),
    }

    async call<T extends ABISerializableConstructor>(args: {
        method?: APIMethods
        path: string
        params?: unknown
        responseType: T
    }): Promise<InstanceType<T>>
    async call<T extends keyof BuiltinTypes>(args: {
        method?: APIMethods
        path: string
        params?: unknown
        responseType: T
    }): Promise<BuiltinTypes[T]>
    async call<T = unknown>(args: {method?: APIMethods; path: string; params?: unknown}): Promise<T>
    async call(args: {
        method?: APIMethods
        path: string
        params?: unknown
        responseType?: ABISerializableType
    }) {
        const response = await this.provider.call(args)
        const {json} = response
        if (Math.floor(response.status / 100) !== 2 || (json && typeof json.error === 'object')) {
            throw new APIError(args.path, response)
        }
        if (args.responseType) {
            return abiDecode({type: args.responseType, object: response.json})
        }
        return response.json || response.text
    }
}
