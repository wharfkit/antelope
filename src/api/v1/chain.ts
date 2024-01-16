import {APIClient} from '../client'

import {
    BlockIdType,
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
    AccountsByAuthorizers,
    GetAbiResponse,
    GetAccountsByAuthorizersParams,
    GetBlockHeaderStateResponse,
    GetBlockInfoResponse,
    GetBlockResponse,
    GetCurrencyStatsItemResponse,
    GetCurrencyStatsResponse,
    GetInfoResponse,
    GetProducerScheduleResponse,
    GetProtocolFeaturesParams,
    GetProtocolFeaturesResponse,
    GetRawAbiResponse,
    GetTableByScopeParams,
    GetTableByScopeResponse,
    GetTableRowsParams,
    GetTableRowsParamsKeyed,
    GetTableRowsParamsTyped,
    GetTableRowsResponse,
    GetTransactionStatusResponse,
    PushTransactionResponse,
    SendTransaction2Options,
    SendTransaction2Response,
    SendTransactionResponse,
    TableIndexType,
    TableIndexTypes,
} from './types'

import {ABISerializableConstructor, ABISerializableType, Serializer} from '../../serializer'
import {isInstanceOf} from '../../utils'

export class ChainAPI {
    constructor(private client: APIClient) {}

    async get_abi(accountName: NameType) {
        return this.client.call<GetAbiResponse>({
            path: '/v1/chain/get_abi',
            params: {account_name: Name.from(accountName)},
        })
    }

    async get_raw_abi(accountName: NameType) {
        return this.client.call({
            path: '/v1/chain/get_raw_abi',
            params: {account_name: Name.from(accountName)},
            responseType: GetRawAbiResponse,
        })
    }

    async get_account(accountName: NameType, responseType = AccountObject) {
        return this.client.call({
            path: '/v1/chain/get_account',
            params: {account_name: Name.from(accountName)},
            responseType: responseType,
        })
    }

    async get_accounts_by_authorizers(params: GetAccountsByAuthorizersParams) {
        return this.client.call({
            path: '/v1/chain/get_accounts_by_authorizers',
            params,
            responseType: AccountsByAuthorizers,
        })
    }

    async get_activated_protocol_features(params?: GetProtocolFeaturesParams) {
        return this.client.call({
            path: '/v1/chain/get_activated_protocol_features',
            params,
            responseType: GetProtocolFeaturesResponse,
        })
    }

    async get_block(block_num_or_id: BlockIdType | UInt32Type) {
        return this.client.call({
            path: '/v1/chain/get_block',
            params: {block_num_or_id},
            responseType: GetBlockResponse,
        })
    }

    async get_block_header_state(block_num_or_id: BlockIdType | UInt32Type) {
        return this.client.call({
            path: '/v1/chain/get_block_header_state',
            params: {block_num_or_id},
            responseType: GetBlockHeaderStateResponse,
        })
    }

    async get_block_info(block_num: UInt32Type) {
        return this.client.call({
            path: '/v1/chain/get_block_info',
            params: {block_num},
            responseType: GetBlockInfoResponse,
        })
    }

    async get_currency_balance(contract: NameType, accountName: NameType, symbol?: string) {
        const params: any = {
            account: Name.from(accountName),
            code: Name.from(contract),
        }
        if (symbol) {
            params.symbol = symbol
        }
        return this.client.call({
            path: '/v1/chain/get_currency_balance',
            params,
            responseType: 'asset[]',
        })
    }

    async get_currency_stats(
        contract: NameType,
        symbol: string
    ): Promise<GetCurrencyStatsResponse> {
        const params: any = {
            code: Name.from(contract),
            symbol,
        }
        const response: GetCurrencyStatsResponse = await this.client.call({
            path: '/v1/chain/get_currency_stats',
            params,
        })
        const result: GetCurrencyStatsResponse = {}
        Object.keys(response).forEach(
            (r) => (result[r] = GetCurrencyStatsItemResponse.from(response[r]))
        )
        return result
    }

    async get_info() {
        return this.client.call({
            path: '/v1/chain/get_info',
            responseType: GetInfoResponse,
            method: 'GET',
        })
    }

    async get_producer_schedule() {
        return this.client.call({
            path: '/v1/chain/get_producer_schedule',
            responseType: GetProducerScheduleResponse,
        })
    }

    async compute_transaction(tx: SignedTransactionType | PackedTransaction) {
        if (!isInstanceOf(tx, PackedTransaction)) {
            tx = PackedTransaction.fromSigned(SignedTransaction.from(tx))
        }
        return this.client.call<SendTransactionResponse>({
            path: '/v1/chain/compute_transaction',
            params: {
                transaction: tx,
            },
        })
    }

    async send_read_only_transaction(tx: SignedTransactionType | PackedTransaction) {
        if (!isInstanceOf(tx, PackedTransaction)) {
            tx = PackedTransaction.fromSigned(SignedTransaction.from(tx))
        }
        return this.client.call<SendTransactionResponse>({
            path: '/v1/chain/send_read_only_transaction',
            params: {
                transaction: tx,
            },
        })
    }

    async push_transaction(tx: SignedTransactionType | PackedTransaction) {
        if (!isInstanceOf(tx, PackedTransaction)) {
            tx = PackedTransaction.fromSigned(SignedTransaction.from(tx))
        }
        return this.client.call<PushTransactionResponse>({
            path: '/v1/chain/push_transaction',
            params: tx,
        })
    }

    async send_transaction(tx: SignedTransactionType | PackedTransaction) {
        if (!isInstanceOf(tx, PackedTransaction)) {
            tx = PackedTransaction.fromSigned(SignedTransaction.from(tx))
        }
        return this.client.call<SendTransactionResponse>({
            path: '/v1/chain/send_transaction',
            params: tx,
        })
    }

    async send_transaction2(
        tx: SignedTransactionType | PackedTransaction,
        options?: SendTransaction2Options
    ) {
        if (!isInstanceOf(tx, PackedTransaction)) {
            tx = PackedTransaction.fromSigned(SignedTransaction.from(tx))
        }
        return this.client.call<SendTransaction2Response>({
            path: '/v1/chain/send_transaction2',
            params: {
                return_failure_trace: true,
                retry_trx: false,
                retry_trx_num_blocks: 0,
                transaction: tx,
                ...options,
            },
        })
    }

    async get_table_rows<Index extends TableIndexType = Name>(
        params: GetTableRowsParams<Index>
    ): Promise<GetTableRowsResponse<Index>>
    async get_table_rows<Key extends keyof TableIndexTypes>(
        params: GetTableRowsParamsKeyed<TableIndexTypes[Key], Key>
    ): Promise<GetTableRowsResponse<TableIndexTypes[Key]>>
    async get_table_rows<
        Row extends ABISerializableConstructor,
        Index extends TableIndexType = Name
    >(
        params: GetTableRowsParamsTyped<Index, Row>
    ): Promise<GetTableRowsResponse<Index, InstanceType<Row>>>
    async get_table_rows<Row extends ABISerializableConstructor, Key extends keyof TableIndexTypes>(
        params: GetTableRowsParamsTyped<TableIndexTypes[Key], Row> &
            GetTableRowsParamsKeyed<TableIndexTypes[Key], Key>
    ): Promise<GetTableRowsResponse<TableIndexTypes[Key], InstanceType<Row>>>
    async get_table_rows(
        params: GetTableRowsParams | GetTableRowsParamsTyped | GetTableRowsParamsKeyed
    ) {
        const type = (params as GetTableRowsParamsTyped).type
        let key_type = (params as GetTableRowsParamsKeyed).key_type
        const someBound = params.lower_bound || params.upper_bound
        if (!key_type && someBound) {
            // determine key type from bounds type
            if (isInstanceOf(someBound, UInt64)) {
                key_type = 'i64'
            } else if (isInstanceOf(someBound, UInt128)) {
                key_type = 'i128'
            } else if (isInstanceOf(someBound, Checksum256)) {
                key_type = 'sha256'
            } else if (isInstanceOf(someBound, Checksum160)) {
                key_type = 'ripemd160'
            }
        }
        if (!key_type) {
            key_type = 'name'
        }
        let json = params.json
        if (json === undefined) {
            // if we know the row type don't ask the node to perform abi decoding
            json = type === undefined
        }
        let upper_bound = params.upper_bound
        if (upper_bound && typeof upper_bound !== 'string') {
            upper_bound = String(upper_bound)
        }
        let lower_bound = params.lower_bound
        if (lower_bound && typeof lower_bound !== 'string') {
            lower_bound = String(lower_bound)
        }
        let scope = params.scope
        if (typeof scope === 'undefined') {
            scope = String(Name.from(params.code))
        } else if (typeof scope !== 'string') {
            scope = String(scope)
        }
        // eslint-disable-next-line prefer-const
        let {rows, more, next_key} = await this.client.call<any>({
            path: '/v1/chain/get_table_rows',
            params: {
                ...params,
                code: Name.from(params.code),
                table: Name.from(params.table),
                limit: params.limit !== undefined ? UInt32.from(params.limit) : undefined,
                scope,
                key_type,
                json,
                upper_bound,
                lower_bound,
            },
        })
        let ram_payers: Name[] | undefined
        if (params.show_payer) {
            ram_payers = []
            rows = rows.map(({data, payer}) => {
                ram_payers!.push(Name.from(payer))
                return data
            })
        }
        if (type) {
            if (json) {
                rows = rows.map((value) => {
                    if (typeof value === 'string' && Bytes.isBytes(value)) {
                        // this handles the case where nodeos bails on abi decoding and just returns a hex string
                        return Serializer.decode({data: Bytes.from(value), type})
                    } else {
                        return Serializer.decode({object: value, type})
                    }
                })
            } else {
                rows = rows
                    .map((hex) => Bytes.from(hex))
                    .map((data) => Serializer.decode({data, type}))
            }
        }
        if (next_key && next_key.length > 0) {
            let indexType: ABISerializableType
            // set index type so we can decode next_key in the response if present
            switch (key_type) {
                case 'i64':
                    indexType = UInt64
                    break
                case 'i128':
                    indexType = UInt128
                    break
                case 'name':
                    indexType = Name
                    break
                case 'float64':
                    indexType = Float64
                    break
                case 'float128':
                    indexType = Float128
                    break
                case 'sha256':
                    indexType = Checksum256
                    break
                case 'ripemd160':
                    indexType = Checksum160
                    break
                default:
                    throw new Error(`Unsupported key type: ${key_type}`)
            }
            if (indexType === Name) {
                // names are sent back as an uint64 string instead of a name string..
                next_key = Name.from(Serializer.decode({object: next_key, type: UInt64}))
            } else {
                next_key = Serializer.decode({object: next_key, type: indexType})
            }
        } else {
            next_key = undefined
        }
        return {rows, more, next_key, ram_payers}
    }

    async get_table_by_scope(params: GetTableByScopeParams) {
        return this.client.call({
            path: '/v1/chain/get_table_by_scope',
            params,
            responseType: GetTableByScopeResponse,
        })
    }

    async get_transaction_status(id: Checksum256Type) {
        return this.client.call({
            path: '/v1/chain/get_transaction_status',
            params: {
                id: Checksum256.from(id),
            },
            responseType: GetTransactionStatusResponse,
        })
    }
}
