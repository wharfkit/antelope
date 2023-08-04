import {APIProvider, Bytes, Checksum160} from '$lib'

const data = global.MOCK_DATA

export class MockProvider implements APIProvider {
    constructor(private api: string = 'https://jungle4.greymass.com') {}

    getFilename(path: string, params?: unknown) {
        const digest = Checksum160.hash(
            Bytes.from(this.api + path + (params ? JSON.stringify(params) : ''), 'utf8')
        ).hexString
        return digest + '.json'
    }

    async getExisting(filename: string) {
        return data[filename]
    }

    async call(path: string, params?: unknown) {
        const filename = this.getFilename(path, params)
        const existing = await this.getExisting(filename)
        if (existing) {
            return existing
        }
        throw new Error(`No data for ${path}`)
    }
}
