import {APIClient} from '../client'

import {
    AccountPermission,
    AccountRefundRequest,
    AccountResourceLimit,
    AccountRexInfo,
    AccountSelfDelegatedBandwidth,
    AccountTotalResources,
    AccountVoterInfo,
} from '../../chain/account'
import {Asset} from '../../chain/asset'
import {Checksum256} from '../../chain/checksum'
import {Name} from '../../chain/name'
import {Struct} from '../../chain/struct'
import {TimePoint, TimePointSec} from '../../chain/time'
import {Int64, UInt32, UInt64} from '../../chain/integer'
import {
    PackedTransaction,
    SignedTransaction,
    SignedTransactionType,
    TransactionHeader,
} from '../../chain/transaction'

class APIResponse extends Struct {
    static abiName = 'api_response'
}

export class ChainAPI {
    constructor(private client: APIClient) {}

    async get_account(account_name: string) {
        return this.client.call({
            path: '/v1/chain/get_account',
            params: {account_name},
            responseType: ChainAPI.GetAccountResponse,
        }) as Promise<ChainAPI.GetAccountResponse>
    }

    async get_info() {
        return this.client.call({
            path: '/v1/chain/get_info',
            responseType: ChainAPI.GetInfoResponse,
        }) as Promise<ChainAPI.GetInfoResponse>
    }

    async push_transaction(tx: SignedTransactionType | PackedTransaction) {
        if (!(tx instanceof PackedTransaction)) {
            tx = PackedTransaction.fromSigned(SignedTransaction.from(tx))
        }
        return this.client.call({
            path: '/v1/chain/push_transaction',
            params: tx,
        }) as Promise<ChainAPI.PushTransactionResponse>
    }
}

export namespace ChainAPI {
    export class GetAccountResponse extends APIResponse {
        /** The account name of the retrieved account */
        @Struct.field('name') account_name!: Name
        /** Highest block number on the chain */
        @Struct.field('uint32') head_block_num!: UInt32
        /** Highest block unix timestamp. */
        @Struct.field('time_point') head_block_time!: TimePoint
        /** Indicator of if this is a privileged system account */
        @Struct.field('bool') privileged!: boolean
        /** Last update to accounts contract as unix timestamp. */
        @Struct.field('time_point') last_code_update!: TimePoint
        /** Account created as unix timestamp. */
        @Struct.field('time_point') created!: TimePoint
        /** Account core token balance */
        @Struct.field('asset') core_liquid_balance!: Asset
        /** */
        @Struct.field('int64') ram_quota!: Int64
        /** */
        @Struct.field('int64') net_weight!: Int64
        /** */
        @Struct.field('int64') cpu_weight!: Int64
        /** */
        @Struct.field(AccountResourceLimit) net_limit!: AccountResourceLimit
        /** */
        @Struct.field(AccountResourceLimit) cpu_limit!: AccountResourceLimit
        /** */
        @Struct.field('uint64') ram_usage!: UInt64
        /** */
        @Struct.field(AccountPermission, {array: true}) permissions!: AccountPermission[]
        /** */
        @Struct.field(AccountTotalResources) total_resources!: AccountTotalResources
        /** */
        @Struct.field(AccountSelfDelegatedBandwidth, {optional: true})
        self_delegated_bandwidth!: AccountSelfDelegatedBandwidth
        /** */
        @Struct.field(AccountRefundRequest, {optional: true}) refund_request!: AccountRefundRequest
        /** */
        @Struct.field(AccountVoterInfo, {optional: true}) voter_info!: AccountVoterInfo
        /** */
        @Struct.field(AccountRexInfo, {optional: true}) rex_info!: AccountRexInfo
    }

    export class GetInfoResponse extends APIResponse {
        /** Hash representing the last commit in the tagged release. */
        @Struct.field('string') server_version!: string
        /** Hash representing the ID of the chain. */
        @Struct.field('checksum256') chain_id!: Checksum256
        /** Highest block number on the chain */
        @Struct.field('uint32') head_block_num!: UInt32
        /** Highest block number on the chain that has been irreversibly applied to state. */
        @Struct.field('uint32') last_irreversible_block_num!: UInt32
        /** Highest block ID on the chain that has been irreversibly applied to state. */
        @Struct.field('checksum256') last_irreversible_block_id!: Checksum256
        /** Highest block ID on the chain. */
        @Struct.field('checksum256') head_block_id!: Checksum256
        /** Highest block unix timestamp. */
        @Struct.field('time_point') head_block_time!: TimePoint
        /** Producer that signed the highest block (head block). */
        @Struct.field('name') head_block_producer!: Name
        /** CPU limit calculated after each block is produced, approximately 1000 times `blockCpuLimit`. */
        @Struct.field('uint64') virtual_block_cpu_limit!: UInt64
        /** NET limit calculated after each block is produced, approximately 1000 times `blockNetLimit`. */
        @Struct.field('uint64') virtual_block_net_limit!: UInt64
        /** Actual maximum CPU limit. */
        @Struct.field('uint64') block_cpu_limit!: UInt64
        /** Actual maximum NET limit. */
        @Struct.field('uint64') block_net_limit!: UInt64
        /** String representation of server version. */
        @Struct.field('string?') server_version_string?: string
        /** Sequential block number representing the best known head in the fork database tree. */
        @Struct.field('uint32') fork_db_head_block_num?: UInt32
        /** Hash representing the best known head in the fork database tree. */
        @Struct.field('checksum256') fork_db_head_block_id?: Checksum256

        getTransactionHeader(secondsAhead = 120): TransactionHeader {
            const expiration = TimePointSec.fromMilliseconds(
                this.head_block_time.toMilliseconds() + secondsAhead * 1000
            )
            const id = this.last_irreversible_block_id
            const prefixArray = id.array.subarray(8, 12)
            const prefix = new Uint32Array(prefixArray.buffer, prefixArray.byteOffset, 1)[0]
            return TransactionHeader.from({
                expiration,
                ref_block_num: this.last_irreversible_block_num.value & 0xffff,
                ref_block_prefix: prefix,
            })
        }
    }

    export interface PushTransactionResponse {
        transaction_id: string
        processed: {
            id: string
            block_num: number
            block_time: string
            receipt: {status: string; cpu_usage_us: number; net_usage_words: number}
            elapsed: number
            net_usage: number
            scheduled: boolean
            action_traces: any[]
            account_ram_delta: any
        }
    }
}
