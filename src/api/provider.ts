export type FetchType = (input: any, init?: any) => Promise<any>

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
    call(path: string, params?: unknown): Promise<APIResponse>
}

export interface FetchProviderOptions {
    /**
     * Fetch instance, must be provided in non-browser environments.
     * You can use the node-fetch package in Node.js.
     */
    fetch?: FetchType
}

/** Default provider that uses the Fetch API to call a single node. */
export class FetchProvider implements APIProvider {
    readonly url: string
    readonly fetch: FetchType

    static getFetch(options: FetchProviderOptions): FetchType {
        if (options.fetch) {
            return options.fetch
        }
        if (typeof window !== 'undefined' && window.fetch) {
            return window.fetch.bind(window)
        }
        if (typeof global !== 'undefined' && global.fetch) {
            return global.fetch.bind(global)
        }
        throw new Error('Missing fetch')
    }

    constructor(url: string, options: FetchProviderOptions = {}) {
        url = url.trim()
        if (url.endsWith('/')) url = url.slice(0, -1)
        this.url = url
        this.fetch = FetchProvider.getFetch(options)
    }

    async call(path: string, params?: unknown) {
        const url = this.url + path
        const response = await this.fetch(url, {
            method: 'POST',
            body: params !== undefined ? JSON.stringify(params) : undefined,
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
