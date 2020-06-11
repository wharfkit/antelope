import 'mocha'
import * as assert from 'assert'
import {join as joinPath} from 'path'
import {MockProvider} from './utils/mock-provider'

import {APIClient} from '../src/api/client'

const client = new APIClient({
    provider: new MockProvider(joinPath(__dirname, 'data')),
})

suite('api v1', function () {
    test('chain get_info', async function () {
        const info = await client.v1.chain.get_info()
        assert.equal(
            info.chain_id.hexString,
            '2a02a0053e5a8cf73a56ba0fda11e4d92e0238a4a2aa74fccf46d5a910746840'
        )
    })
})
