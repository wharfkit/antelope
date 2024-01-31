import {APIMethods} from './client'

type Fetch = (input: any, init?: any) => Promise<any>

/** Response to an API call.  */
export interface APIResponse {
    json?: any
    text: string
    status: number
    headers: Record<string, string>
}

export interface APIProvider {
    /**
     * Call an API endpoint and return the response.
     * Provider is responsible for JSON encoding the params and decoding the response.
     * @argument path The endpoint path, e.g. `/v1/chain/get_info`
     * @argument params The request body if any.
     */
    call(args: {path: string; params?: unknown; method?: APIMethods}): Promise<APIResponse>
}

export interface FetchProviderOptions {
    /**
     * Fetch instance, must be provided in non-browser environments.
     * You can use the node-fetch package in Node.js.
     */
    fetch?: Fetch
}

/** Default provider that uses the Fetch API to call a single node. */
export class FetchProvider implements APIProvider {
    readonly url: string
    readonly fetch: Fetch

    constructor(url: string, options: FetchProviderOptions = {}) {
        url = url.trim()
        if (url.endsWith('/')) url = url.slice(0, -1)
        this.url = url
        if (!options.fetch) {
            if (typeof window !== 'undefined' && window.fetch) {
                this.fetch = window.fetch.bind(window)
            } else if (typeof global !== 'undefined' && global.fetch) {
                this.fetch = global.fetch.bind(global)
            } else {
                throw new Error('Missing fetch')
            }
        } else {
            this.fetch = options.fetch
        }
    }

    async call(args: {
        path: string
        params?: unknown
        method?: APIMethods
        headers?: Record<string, string>
    }) {
        const url = this.url + args.path
        const reqBody = args.params !== undefined ? JSON.stringify(args.params) : undefined
        const reqHeaders = {
            ...args.headers,
        }
        const response = await this.fetch(url, {
            method: args.method || 'POST',
            body: reqBody,
            headers: reqHeaders,
        })
        const text = await response.text()
        let json: any
        try {
            json = JSON.parse(text)
        } catch {
            // ignore json parse errors
        }
        const headers = {}
        for (const [key, value] of response.headers.entries()) {
            headers[key] = value
        }
        return {headers, status: response.status, json, text}
    }
}
