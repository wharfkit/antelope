import {APIClient} from '../client'

import {
    Bytes,
    Checksum160,
    Checksum256,
    Checksum256Type,
    Float128,
    Float64,
    Name,
    NameType,
    PackedTransaction,
    SignedTransaction,
    SignedTransactionType,
    UInt128,
    UInt32,
    UInt32Type,
    UInt64,
} from '../../chain'

import {
    GetAbiResponse,
    GetTransactionResponse
} from './types'

import {ABISerializableConstructor, ABISerializableType, Serializer} from '../../serializer'
import {isInstanceOf} from '../../utils'

export class HistoryAPI {
    constructor(private client: APIClient) {}

    async get_actions(accountName: NameType) {
        return this.client.call<GetAbiResponse>({
            path: '/v1/history/get_actions',
            params: {account_name: Name.from(accountName)},
        })
    }

    async get_ransaction(id: Checksum256, client: APIClient) {
        return client.call({
            path: '/v1/history/get_transaction',
            params: {traces: false, id},
            responseType: GetTransactionResponse,
        })
    }

    async get_key_accounts(accountName: NameType) {
        return this.client.call<GetAbiResponse>({
            path: '/v1/history/get_key_accounts',
            params: {account_name: Name.from(accountName)},
        })
    }

    async get_controlled_accounts(accountName: NameType) {
        return this.client.call<GetAbiResponse>({
            path: '/v1/history/get_controlled_accounts',
            params: {account_name: Name.from(accountName)},
        })
    }
}
