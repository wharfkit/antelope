import {assert} from 'chai'

import {ABI, APIClient, Blob, Checksum256, Name, NameType, Struct} from '$lib'
import {MockProvider} from './utils/mock-provider'

suite('api', function () {
    test('accepts plugin', async function () {
        // Response type
        interface GetAbiResponse {
            account_name: string
            abi?: ABI.Def
        }
        // Client
        class CustomAPI extends APIClient {
            async get_abi(accountName: NameType) {
                return this.call<GetAbiResponse>({
                    path: '/v1/chain/get_abi',
                    params: {account_name: Name.from(accountName)},
                })
            }
        }
        const provider = new MockProvider('https://jungle4.greymass.com')
        const client = new CustomAPI({provider})
        assert.instanceOf(client, APIClient)
        const result = await client.get_abi('eosio.token')
        assert.equal(result.account_name, 'eosio.token')
    })
    test('get_raw_abi', async function () {
        // Response type
        @Struct.type('get_raw_abi_response')
        class GetRawAbiResponse extends Struct {
            @Struct.field('name') declare account_name: Name
            @Struct.field('checksum256') declare code_hash: Checksum256
            @Struct.field('checksum256') declare abi_hash: Checksum256
            @Struct.field(Blob) declare abi: Blob
        }
        // Client
        class CustomAPI extends APIClient {
            async get_raw_abi(accountName: NameType) {
                return this.call({
                    path: '/v1/chain/get_raw_abi',
                    params: {account_name: Name.from(accountName)},
                    responseType: GetRawAbiResponse,
                })
            }
        }
        const provider = new MockProvider('https://jungle4.greymass.com')
        const client = new CustomAPI({provider})
        assert.instanceOf(client, APIClient)
        const result = await client.get_raw_abi('eosio.token')
        assert.instanceOf(result.account_name, Name)
        assert.instanceOf(result.code_hash, Checksum256)
        assert.instanceOf(result.abi_hash, Checksum256)
        assert.instanceOf(result.abi, Blob)
    })
})
