import fetch, {Headers} from 'node-fetch'
import {join as joinPath} from 'path'
import {promisify} from 'util'
import {readFile as _readFile, writeFile as _writeFile} from 'fs'

const readFile = promisify(_readFile)
const writeFile = promisify(_writeFile)

import {APIProvider, Bytes, Checksum160, FetchProvider} from '$lib'

export class MockProvider implements APIProvider {
    recordProvider = new FetchProvider(this.api, {fetch})

    constructor(private api: string = 'https://jungle3.greymass.com') {}

    getFilename(path: string, params?: unknown) {
        const digest = Checksum160.hash(
            Bytes.from(this.api + path + (params ? JSON.stringify(params) : ''), 'utf8')
        ).hexString
        return joinPath(__dirname, '../data', digest + '.json')
    }

    async getExisting(filename: string) {
        try {
            const data = await readFile(filename)
            return JSON.parse(data.toString('utf8'))
        } catch (error) {
            if ((<any>error).code !== 'ENOENT') {
                throw error
            }
        }
    }

    async call(path: string, params?: unknown) {
        const filename = this.getFilename(path, params)
        if (process.env['MOCK_RECORD'] !== 'overwrite') {
            const existing = await this.getExisting(filename)
            if (existing) {
                return {
                    ...existing,
                    headers: new Headers(existing.headers),
                }
            }
        }
        if (process.env['MOCK_RECORD']) {
            const response = await this.recordProvider.call(path, params)
            const headers = response.headers.raw()
            const json = JSON.stringify(
                {
                    ...response,
                    headers,
                },
                undefined,
                4
            )
            await writeFile(filename, json)
            return response
        } else {
            throw new Error(`No data for ${path}`)
        }
    }
}
