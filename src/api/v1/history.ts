import {APIClient} from '../client'

import {
    Checksum256,
    Name,
    NameType,
} from '../../chain'

import {
    GetActionsResponse,
    GetTransactionResponse,
    GetKeyAccountsResponse,
    GetControlledAccountsResponse,
} from './types'

export class HistoryAPI {
    constructor(private client: APIClient) {}

    async get_actions(accountName: NameType) {
        return this.client.call({
            path: '/v1/history/get_actions',
            params: {account_name: Name.from(accountName)},
            responseType: GetActionsResponse,
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
        return this.client.call({
            path: '/v1/history/get_key_accounts',
            params: {account_name: Name.from(accountName)},
            responseType: GetKeyAccountsResponse,
        })
    }

    async get_controlled_accounts(accountName: NameType) {
        return this.client.call({
            path: '/v1/history/get_controlled_accounts',
            params: {account_name: Name.from(accountName)},
            responseType: GetControlledAccountsResponse,
        })
    }
}
