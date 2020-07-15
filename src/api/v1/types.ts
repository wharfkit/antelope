import {ABI} from '../../chain/abi'
import {Asset} from '../../chain/asset'
import {Checksum256} from '../../chain/checksum'
import {Int32, Int64, UInt16, UInt32, UInt64} from '../../chain/integer'
import {Name} from '../../chain/name'
import {PermissionLevel} from '../../chain/permission-level'
import {PublicKey} from '../../chain/public-key'
import {Struct} from '../../chain/struct'
import {TimePoint, TimePointSec} from '../../chain/time'
import {Signature} from '../../chain/signature'
import {TransactionHeader, TransactionReceipt} from '../../chain/transaction'

@Struct.type('account_auth')
export class AccountAuth extends Struct {
    @Struct.field('uint32') weight!: UInt32
    @Struct.field(PermissionLevel) permission!: PermissionLevel
}

@Struct.type('key_auth')
export class KeyAuth extends Struct {
    @Struct.field('uint32') weight!: UInt32
    @Struct.field('public_key') key!: PublicKey
}

@Struct.type('required_auth')
export class RequiredAuth extends Struct {
    @Struct.field('uint32') threshold!: UInt32
    @Struct.field(KeyAuth, {array: true, default: []}) keys!: KeyAuth[]
    @Struct.field(AccountAuth, {array: true, default: []}) accounts!: AccountAuth[]
}

@Struct.type('account_permission')
export class AccountPermission extends Struct {
    @Struct.field('name') perm_name!: Name
    @Struct.field('name') parent!: Name
    @Struct.field(RequiredAuth) required_auth!: RequiredAuth
}

@Struct.type('account_resource_limit')
export class AccountResourceLimit extends Struct {
    @Struct.field('int32') used!: Int32
    @Struct.field('int32') available!: Int32
    @Struct.field('int32') max!: Int32
}

@Struct.type('account_total_resources')
export class AccountTotalResources extends Struct {
    @Struct.field('name') owner!: Name
    @Struct.field('asset') net_weight!: Asset
    @Struct.field('asset') cpu_weight!: Asset
    @Struct.field('uint64') ram_bytes!: UInt64
}

@Struct.type('account_self_delegated_bandwidth')
export class AccountSelfDelegatedBandwidth extends Struct {
    @Struct.field('name') from!: Name
    @Struct.field('name') to!: Name
    @Struct.field('asset') net_weight!: Asset
    @Struct.field('asset') cpu_weight!: Asset
}

@Struct.type('account_refund_request')
export class AccountRefundRequest extends Struct {
    @Struct.field('name') owner!: Name
    @Struct.field('time_point') request_time!: TimePoint
    @Struct.field('asset') net_amount!: Asset
    @Struct.field('asset') cpu_amount!: Asset
}

@Struct.type('account_voter_info')
export class AccountVoterInfo extends Struct {
    @Struct.field('name') owner!: Name
    @Struct.field('name') proxy!: Name
    @Struct.field('name', {array: true}) producers!: Name[]
    @Struct.field('int64') staked!: Int64
    // @Struct.field('float64') last_vote_weight!: Float64
    // @Struct.field('float64') proxied_vote_weight!: Float64
    @Struct.field('bool') is_proxy!: boolean
    @Struct.field('uint32') flags1!: UInt32
    @Struct.field('uint32') reserved2!: UInt32
    @Struct.field('string') reserved3!: string
}

@Struct.type('account_rex_info_maturities')
export class AccountRexInfoMaturities extends Struct {
    @Struct.field('time_point') key!: TimePoint
    @Struct.field('int64') value!: Int64
}

@Struct.type('account_rex_info')
export class AccountRexInfo extends Struct {
    @Struct.field('uint32') version!: UInt32
    @Struct.field('name') owner!: Name
    @Struct.field('asset') vote_stake!: Asset
    @Struct.field('asset') rex_balance!: Asset
    @Struct.field('int64') matured_rex!: Int64
    @Struct.field(AccountRexInfoMaturities, {array: true})
    rex_maturities!: AccountRexInfoMaturities[]
}

export interface GetAbiResponse {
    account_name: string
    abi?: ABI.Def
}

@Struct.type('account_object')
export class AccountObject extends Struct {
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
    @Struct.field('asset?') core_liquid_balance?: Asset
    @Struct.field('int64') ram_quota!: Int64
    @Struct.field('int64') net_weight!: Int64
    @Struct.field('int64') cpu_weight!: Int64
    @Struct.field(AccountResourceLimit) net_limit!: AccountResourceLimit
    @Struct.field(AccountResourceLimit) cpu_limit!: AccountResourceLimit
    @Struct.field('uint64') ram_usage!: UInt64
    @Struct.field(AccountPermission, {array: true}) permissions!: AccountPermission[]
    @Struct.field(AccountTotalResources) total_resources!: AccountTotalResources
    @Struct.field(AccountSelfDelegatedBandwidth, {optional: true})
    self_delegated_bandwidth?: AccountSelfDelegatedBandwidth
    @Struct.field(AccountRefundRequest, {optional: true}) refund_request?: AccountRefundRequest
    @Struct.field(AccountVoterInfo, {optional: true}) voter_info?: AccountVoterInfo
    @Struct.field(AccountRexInfo, {optional: true}) rex_info?: AccountRexInfo
}

@Struct.type('new_producers_entry')
export class NewProducersEntry extends Struct {
    @Struct.field('name') producer_name!: Name
    @Struct.field('public_key') block_signing_key!: PublicKey
}

@Struct.type('new_producers')
export class NewProducers extends Struct {
    @Struct.field('uint32') version!: UInt32
    @Struct.field(NewProducersEntry, {array: true}) producers!: NewProducersEntry
}

@Struct.type('get_block_response')
export class GetBlockResponse extends Struct {
    @Struct.field('time_point') timestamp!: TimePoint
    @Struct.field('name') producer!: Name
    @Struct.field('uint16') confirmed!: UInt16
    @Struct.field('checksum256') previous!: Checksum256
    @Struct.field('checksum256') transaction_mroot!: Checksum256
    @Struct.field('checksum256') action_mroot!: Checksum256
    @Struct.field('uint32') schedule_version!: UInt32
    @Struct.field(NewProducers, {optional: true}) new_producers?: NewProducers
    @Struct.field('any', {optional: true}) header_extensions?: any
    @Struct.field('any', {optional: true}) new_protocol_features?: any
    @Struct.field('signature') producer_signature!: Signature
    @Struct.field(TransactionReceipt, {array: true}) transactions!: TransactionReceipt[]
    @Struct.field('any', {optional: true}) block_extensions!: any
    @Struct.field('checksum256') id!: Checksum256
    @Struct.field('uint32') block_num!: UInt32
    @Struct.field('uint32') ref_block_prefix!: UInt32
}

@Struct.type('get_info_response')
export class GetInfoResponse extends Struct {
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
