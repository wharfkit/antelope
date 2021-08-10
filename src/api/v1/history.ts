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
    AccountObject,
    GetAbiResponse,
    GetBlockHeaderStateResponse,
    GetBlockResponse,
    GetInfoResponse,
    GetTableByScopeParams,
    GetTableByScopeResponse,
    GetTableRowsParams,
    GetTableRowsParamsKeyed,
    GetTableRowsParamsTyped,
    GetTableRowsResponse,
    PushTransactionResponse,
    TableIndexType,
    TableIndexTypes,
} from './types'

import {ABISerializableConstructor, ABISerializableType, Serializer} from '../../serializer'
import {isInstanceOf} from '../../utils'

export class HistoryAPI {
    constructor(private client: APIClient) {}

    async get_actions(accountName: NameType) {
        return this.client.call<GetAbiResponse>({
            path: '/v1/chain/get_abi',
            params: {account_name: Name.from(accountName)},
        })
    }

    async get_transaction(accountName: NameType) {
        return this.client.call<GetAbiResponse>({
            path: '/v1/chain/get_abi',
            params: {account_name: Name.from(accountName)},
        })
    }

    async get_key_accounts(accountName: NameType) {
        return this.client.call<GetAbiResponse>({
            path: '/v1/chain/get_abi',
            params: {account_name: Name.from(accountName)},
        })
    }

    async get_controlled_accounts(accountName: NameType) {
        return this.client.call<GetAbiResponse>({
            path: '/v1/chain/get_abi',
            params: {account_name: Name.from(accountName)},
        })
    }
}
