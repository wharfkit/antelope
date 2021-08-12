import {APIClient} from '../client'

import {
    Checksum256,
    Int32,
    Int32Type,
    Name,
    NameType,
    PublicKey,
    PublicKeyType,
    UInt32,
    UInt32Type,
} from '../../chain'

import {
    GetActionsResponse,
    GetControlledAccountsResponse,
    GetKeyAccountsResponse,
    GetTransactionResponse,
} from './types'

export class HistoryAPI {
    constructor(private client: APIClient) {}

    async get_actions(accountName: NameType, pos: Int32Type, offset: Int32Type) {
        return this.client.call({
            path: '/v1/history/get_actions',
            params: {
                account_name: Name.from(accountName),
                pos: Int32.from(pos),
                offset: Int32.from(offset),
            },
            responseType: GetActionsResponse,
        })
    }

    async get_transaction(id: Checksum256, blockNumHint?: UInt32Type) {
        return this.client.call({
            path: '/v1/history/get_transaction',
            params: {id, block_num_hint: blockNumHint && UInt32.from(blockNumHint)},
            responseType: GetTransactionResponse,
        })
    }

    async get_key_accounts(publicKey: PublicKeyType) {
        return this.client.call({
            path: '/v1/history/get_key_accounts',
            params: {public_key: PublicKey.from(publicKey)},
            responseType: GetKeyAccountsResponse,
        })
    }

    async get_controlled_accounts(controllingAccount: NameType) {
        return this.client.call({
            path: '/v1/history/get_controlled_accounts',
            params: {controlling_account: Name.from(controllingAccount)},
            responseType: GetControlledAccountsResponse,
        })
    }
}
