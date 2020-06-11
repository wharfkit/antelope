import {APIProvider, FetchProvider, FetchProviderOptions} from './provider'
import {ABISerializableType} from '../serializer/serializable'
import {decode} from '../serializer/decoder'
import {ChainAPI} from './v1/chain'

export interface APIClientOptions extends FetchProviderOptions {
    /** URL to the API node to use, only used if the provider option is not set. */
    url?: string
    /** API provider to use, if omitted and the url option is set the default provider will be used.  */
    provider?: APIProvider
}

export class APIClient {
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

    async call(args: {
        path: string
        params?: unknown
        /** Type to decode response as. */
        responseType?: ABISerializableType
    }) {
        const response = await this.provider.call(args.path, args.params)
        if (args.responseType) {
            return decode({type: args.responseType, object: response})
        }
        return response
    }
}
