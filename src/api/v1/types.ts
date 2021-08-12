import {
    ABI,
    AnyAction,
    Asset,
    Authority,
    BlockTimestamp,
    Bytes,
    Checksum160,
    Checksum256,
    Float128,
    Float64,
    Int32,
    Int64,
    Name,
    NameType,
    PublicKey,
    Signature,
    Struct,
    TimePoint,
    TimePointSec,
    Transaction,
    TransactionHeader,
    TransactionReceipt,
    UInt128,
    UInt16,
    UInt32,
    UInt32Type,
    UInt64,
} from '../../chain'

import {ABISerializableObject, ABISerializableType, Serializer} from '../../serializer'

@Struct.type('account_permission')
export class AccountPermission extends Struct {
    @Struct.field('name') perm_name!: Name
    @Struct.field('name') parent!: Name
    @Struct.field(Authority) required_auth!: Authority
}

@Struct.type('account_resource_limit')
export class AccountResourceLimit extends Struct {
    @Struct.field('int64') used!: Int64
    @Struct.field('int64') available!: Int64
    @Struct.field('int64') max!: Int64
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
    @Struct.field('int64', {optional: true}) staked?: Int64
    // @Struct.field('float64') last_vote_weight!: Float64
    // @Struct.field('float64') proxied_vote_weight!: Float64
    @Struct.field('bool') is_proxy!: boolean
    @Struct.field('uint32', {optional: true}) flags1?: UInt32
    @Struct.field('uint32') reserved2!: UInt32
    @Struct.field('string') reserved3!: string
}

@Struct.type('account_rex_info_maturities')
export class AccountRexInfoMaturities extends Struct {
    /** Expected results from after EOSIO.Contracts v1.9.0 */
    @Struct.field('time_point', {optional: true}) key?: TimePoint
    @Struct.field('int64', {optional: true}) value?: Int64
    /** Expected results from before EOSIO.Contracts v1.9.0 */
    @Struct.field('time_point', {optional: true}) first?: TimePoint
    @Struct.field('int64', {optional: true}) second?: Int64
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

    getPermission(permission: NameType): AccountPermission {
        const name = Name.from(permission)
        const match = this.permissions.find((p) => p.perm_name.equals(name))
        if (!match) {
            throw new Error(`Unknown permission ${name} on account ${this.account_name}.`)
        }
        return match
    }
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

@Struct.type('block_extension')
export class BlockExtension extends Struct {
    @Struct.field('uint16') type!: UInt16
    @Struct.field('bytes') data!: Bytes
}

@Struct.type('header_extension')
export class HeaderExtension extends Struct {
    @Struct.field('uint16') type!: UInt16
    @Struct.field('bytes') data!: Bytes
}

// fc "mutable variant" returned by get_block api
export class TrxVariant implements ABISerializableObject {
    static abiName = 'trx_variant'

    static from(data: any) {
        let id: Checksum256
        let extra: Record<string, any>
        if (typeof data === 'string') {
            id = Checksum256.from(data)
            extra = {}
        } else {
            id = Checksum256.from(data.id)
            extra = data
        }
        return new this(id, extra)
    }

    constructor(readonly id: Checksum256, readonly extra: Record<string, any>) {}

    get transaction(): Transaction | undefined {
        if (this.extra.packed_trx) {
            return Serializer.decode({data: this.extra.packed_trx, type: Transaction})
        }
    }

    get signatures(): Signature[] | undefined {
        if (this.extra.signatures) {
            return this.extra.signatures.map(Signature.from)
        }
    }

    equals(other: any) {
        return this.id.equals(other.id)
    }

    toJSON() {
        return this.id
    }
}

@Struct.type('get_block_response_receipt')
export class GetBlockResponseTransactionReceipt extends TransactionReceipt {
    @Struct.field(TrxVariant) trx!: TrxVariant

    get id(): Checksum256 {
        return this.trx.id
    }
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
    @Struct.field('header_extension', {optional: true}) header_extensions?: HeaderExtension[]
    @Struct.field('any', {optional: true}) new_protocol_features?: any
    @Struct.field('signature') producer_signature!: Signature
    @Struct.field(GetBlockResponseTransactionReceipt, {array: true})
    transactions!: GetBlockResponseTransactionReceipt[]
    @Struct.field('block_extension', {optional: true}) block_extensions!: BlockExtension[]
    @Struct.field('checksum256') id!: Checksum256
    @Struct.field('uint32') block_num!: UInt32
    @Struct.field('uint32') ref_block_prefix!: UInt32
}

@Struct.type('active_schedule_producer_authority')
export class ActiveScheduleProducerAuthority extends Struct {
    @Struct.field('name') producer_name!: Name
    @Struct.field('any') authority!: any
}

@Struct.type('active_schedule_producer')
export class ActiveScheduleProducer extends Struct {
    @Struct.field('name') producer_name!: Name
    @Struct.field(ActiveScheduleProducerAuthority) authority!: ActiveScheduleProducerAuthority
}

@Struct.type('active_schedule')
export class ActiveSchedule extends Struct {
    @Struct.field('uint32') version!: UInt32
    @Struct.field(ActiveScheduleProducer, {array: true}) producers!: ActiveScheduleProducer[]
}

@Struct.type('block_state_header')
export class BlockStateHeader extends Struct {
    @Struct.field('time_point') timestamp!: TimePoint
    @Struct.field('name') producer!: Name
    @Struct.field('uint16') confirmed!: UInt16
    @Struct.field('checksum256') previous!: Checksum256
    @Struct.field('checksum256') transaction_mroot!: Checksum256
    @Struct.field('checksum256') action_mroot!: Checksum256
    @Struct.field('uint32') schedule_version!: UInt32
    @Struct.field(HeaderExtension, {array: true, optional: true})
    header_extensions?: HeaderExtension[]
    @Struct.field('signature') producer_signature!: Signature
}

@Struct.type('get_block_header_state_response')
export class GetBlockHeaderStateResponse extends Struct {
    @Struct.field('uint32') block_num!: UInt32
    @Struct.field('uint32') dpos_proposed_irreversible_blocknum!: UInt32
    @Struct.field('uint32') dpos_irreversible_blocknum!: UInt32
    @Struct.field('checksum256') id!: Checksum256
    @Struct.field(BlockStateHeader) header!: BlockStateHeader
    /** Unstructured any fields specific to header state calls */
    @Struct.field('any') active_schedule!: any
    @Struct.field('any') blockroot_merkle!: any
    @Struct.field('any') producer_to_last_produced!: any
    @Struct.field('any') producer_to_last_implied_irb!: any
    @Struct.field('any') valid_block_signing_authority!: any
    @Struct.field('any') confirm_count!: any
    @Struct.field('any') pending_schedule!: any
    @Struct.field('any') activated_protocol_features!: any
    @Struct.field('any') additional_signatures!: any
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
    @Struct.field('uint32?') fork_db_head_block_num?: UInt32
    /** Hash representing the best known head in the fork database tree. */
    @Struct.field('checksum256?') fork_db_head_block_id?: Checksum256

    getTransactionHeader(secondsAhead = 120): TransactionHeader {
        const expiration = TimePointSec.fromMilliseconds(
            this.head_block_time.toMilliseconds() + secondsAhead * 1000
        )
        const id = this.last_irreversible_block_id
        const prefixArray = id.array.subarray(8, 12)
        const prefix = new Uint32Array(prefixArray.buffer, prefixArray.byteOffset, 1)[0]
        return TransactionHeader.from({
            expiration,
            ref_block_num: Number(this.last_irreversible_block_num) & 0xffff,
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

export interface TableIndexTypes {
    float128: Float128
    float64: Float64
    i128: UInt128
    i64: UInt64
    name: Name
    ripemd160: Checksum160
    sha256: Checksum256
}

export type TableIndexType = Name | UInt64 | UInt128 | Float64 | Checksum256 | Checksum160

export interface GetTableRowsParams<Index = TableIndexType | string> {
    /** The name of the smart contract that controls the provided table. */
    code: NameType
    /** Name of the table to query. */
    table: NameType
    /** The account to which this data belongs, if omitted will be set to be same as `code`. */
    scope?: string | TableIndexType
    /** Lower lookup bound. */
    lower_bound?: Index
    /** Upper lookup bound. */
    upper_bound?: Index
    /** How many rows to fetch, defaults to 10 if unset. */
    limit?: UInt32Type
    /** Whether to iterate records in reverse order. */
    reverse?: boolean
    /** Position of the index used, defaults to primary. */
    index_position?:
        | 'primary'
        | 'secondary'
        | 'tertiary'
        | 'fourth'
        | 'fifth'
        | 'sixth'
        | 'seventh'
        | 'eighth'
        | 'ninth'
        | 'tenth'
    /**
     * Whether node should try to decode row data using code abi.
     * Determined automatically based the `type` param if omitted.
     */
    json?: boolean
    /**
     * Set to true to populate the ram_payers array in the response.
     */
    show_payer?: boolean
}

export interface GetTableRowsParamsKeyed<Index = TableIndexType, Key = keyof TableIndexTypes>
    extends GetTableRowsParams<Index> {
    /** Index key type, determined automatically when passing a typed `upper_bound` or `lower_bound`. */
    key_type: Key
}

export interface GetTableRowsParamsTyped<Index = TableIndexType | string, Row = ABISerializableType>
    extends GetTableRowsParams<Index> {
    /** Result type for each row. */
    type: Row
}

export interface GetTableRowsResponse<Index = TableIndexType, Row = any> {
    rows: Row[]
    more: boolean
    ram_payers?: Name[]
    next_key?: Index
}

export interface GetTableByScopeParams {
    code: NameType
    table?: NameType
    lower_bound?: string
    upper_bound?: string
    limit?: UInt32Type
    reverse?: boolean
}

@Struct.type('get_table_by_scope_response_row')
export class GetTableByScopeResponseRow extends Struct {
    @Struct.field('name') code!: Name
    @Struct.field('name') scope!: Name
    @Struct.field('name') table!: Name
    @Struct.field('name') payer!: Name
    @Struct.field('uint32') count!: UInt32
}

@Struct.type('get_table_by_scope_response')
export class GetTableByScopeResponse extends Struct {
    @Struct.field(GetTableByScopeResponseRow, {array: true}) rows!: GetTableByScopeResponseRow[]
    @Struct.field('string') more!: string
}

@Struct.type('ordered_action_result')
export class OrderedActionsResult extends Struct {
    @Struct.field(UInt64) global_action_seq!: UInt64
    @Struct.field(Int64) account_action_seq!: Int64
    @Struct.field(UInt32) block_num!: UInt32
    @Struct.field(BlockTimestamp) block_time!: BlockTimestamp
    @Struct.field('any') action_trace?: any
    @Struct.field('boolean?') irrevirsible?: boolean
}

@Struct.type('get_actions_response')
export class GetActionsResponse extends Struct {
    @Struct.field(OrderedActionsResult, {array: true}) actions!: OrderedActionsResult[]
    @Struct.field(Int32) last_irreversible_block!: Int32
    @Struct.field(Int32) head_block_num!: Int32
    @Struct.field('boolean?') time_limit_exceeded_error?: boolean
}

@Struct.type('transaction_trace')
export class TransactionTrace extends Struct {}

@Struct.type('trx')
export class Trx extends Struct {
    @Struct.field('any') actions!: AnyAction[]
    @Struct.field('any') context_free_actions!: AnyAction[]
    @Struct.field('any') context_free_data!: any[]
    @Struct.field('number') delay_sec!: number
    @Struct.field('string') expiration!: string
    @Struct.field('number') max_cpu_usage_ms!: number
    @Struct.field('number') max_net_usage_words!: number
    @Struct.field('number') ref_block_num!: number
    @Struct.field('number') ref_block_prefix!: number
    @Struct.field('string', {array: true}) signatures!: string[]
}

@Struct.type('transaction_info')
export class TransactionInfo extends Struct {
    @Struct.field(TransactionReceipt) receipt!: TransactionReceipt
    @Struct.field('trx') trx!: Trx
}

@Struct.type('get_transaction_response')
export class GetTransactionResponse extends Struct {
    @Struct.field(Checksum256) id!: Checksum256
    @Struct.field(UInt32) block_num!: UInt32
    @Struct.field(BlockTimestamp) block_time!: BlockTimestamp
    @Struct.field(UInt32) last_irreversible_block!: UInt32
    @Struct.field('any?') traces?: TransactionTrace[]
    @Struct.field('any') trx!: TransactionInfo
}

@Struct.type('get_key_accounts_response')
export class GetKeyAccountsResponse extends Struct {
    @Struct.field('name', {array: true}) account_names!: Name[]
}

@Struct.type('get_controlled_accounts_response')
export class GetControlledAccountsResponse extends Struct {
    @Struct.field('name', {array: true}) controlled_accounts!: Name[]
}
