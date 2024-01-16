import pako from 'pako'
import {
    ABI,
    AnyAction,
    Asset,
    Authority,
    Blob,
    BlockId,
    BlockTimestamp,
    Bytes,
    Checksum160,
    Checksum256,
    Float128,
    Float64,
    Int32,
    Int64,
    KeyWeight,
    Name,
    NameType,
    PermissionLevel,
    PublicKey,
    PublicKeyType,
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
    Weight,
} from '../../chain'

import {ABISerializableObject, ABISerializableType, Serializer} from '../../serializer'

@Struct.type('account_linked_action')
export class AccountLinkedAction extends Struct {
    @Struct.field('name') declare account: Name
    @Struct.field('name', {optional: true}) declare action: Name
}

@Struct.type('account_permission')
export class AccountPermission extends Struct {
    @Struct.field('name') declare perm_name: Name
    @Struct.field('name') declare parent: Name
    @Struct.field(Authority) declare required_auth: Authority
    @Struct.field(AccountLinkedAction, {optional: true, array: true})
    declare linked_actions: AccountLinkedAction[]
}

@Struct.type('account_resource_limit')
export class AccountResourceLimit extends Struct {
    @Struct.field('int64') declare used: Int64
    @Struct.field('int64') declare available: Int64
    @Struct.field('int64') declare max: Int64
    @Struct.field('time_point', {optional: true}) declare last_usage_update_time: TimePoint
    @Struct.field('int64', {optional: true}) declare current_used: Int64
}

@Struct.type('account_total_resources')
export class AccountTotalResources extends Struct {
    @Struct.field('name') declare owner: Name
    @Struct.field('asset') declare net_weight: Asset
    @Struct.field('asset') declare cpu_weight: Asset
    @Struct.field('uint64') declare ram_bytes: UInt64
}

@Struct.type('account_self_delegated_bandwidth')
export class AccountSelfDelegatedBandwidth extends Struct {
    @Struct.field('name') declare from: Name
    @Struct.field('name') declare to: Name
    @Struct.field('asset') declare net_weight: Asset
    @Struct.field('asset') declare cpu_weight: Asset
}

@Struct.type('account_refund_request')
export class AccountRefundRequest extends Struct {
    @Struct.field('name') declare owner: Name
    @Struct.field('time_point') declare request_time: TimePoint
    @Struct.field('asset') declare net_amount: Asset
    @Struct.field('asset') declare cpu_amount: Asset
}

@Struct.type('account_voter_info')
export class AccountVoterInfo extends Struct {
    @Struct.field('name') declare owner: Name
    @Struct.field('name') declare proxy: Name
    @Struct.field('name', {array: true}) declare producers: Name[]
    @Struct.field('int64', {optional: true}) staked?: Int64
    @Struct.field('float64') declare last_vote_weight: Float64
    @Struct.field('float64') declare proxied_vote_weight: Float64
    @Struct.field('bool') declare is_proxy: boolean
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
    @Struct.field('uint32') declare version: UInt32
    @Struct.field('name') declare owner: Name
    @Struct.field('asset') declare vote_stake: Asset
    @Struct.field('asset') declare rex_balance: Asset
    @Struct.field('int64') declare matured_rex: Int64
    @Struct.field(AccountRexInfoMaturities, {array: true})
    declare rex_maturities: AccountRexInfoMaturities[]
}

export interface GetAbiResponse {
    account_name: string
    abi?: ABI.Def
}

@Struct.type('get_raw_abi_response')
export class GetRawAbiResponse extends Struct {
    @Struct.field('name') declare account_name: Name
    @Struct.field('checksum256') declare code_hash: Checksum256
    @Struct.field('checksum256') declare abi_hash: Checksum256
    @Struct.field(Blob) declare abi: Blob
}

@Struct.type('account_object')
export class AccountObject extends Struct {
    /** The account name of the retrieved account */
    @Struct.field('name') declare account_name: Name
    /** Highest block number on the chain */
    @Struct.field('uint32') declare head_block_num: UInt32
    /** Highest block unix timestamp. */
    @Struct.field('time_point') declare head_block_time: TimePoint
    /** Indicator of if this is a privileged system account */
    @Struct.field('bool') declare privileged: boolean
    /** Last update to accounts contract as unix timestamp. */
    @Struct.field('time_point') declare last_code_update: TimePoint
    /** Account created as unix timestamp. */
    @Struct.field('time_point') declare created: TimePoint
    /** Account core token balance */
    @Struct.field('asset?') core_liquid_balance?: Asset
    @Struct.field('int64') declare ram_quota: Int64
    @Struct.field('int64') declare net_weight: Int64
    @Struct.field('int64') declare cpu_weight: Int64
    @Struct.field(AccountResourceLimit) declare net_limit: AccountResourceLimit
    @Struct.field(AccountResourceLimit) declare cpu_limit: AccountResourceLimit
    @Struct.field(AccountResourceLimit, {optional: true})
    declare subjective_cpu_bill_limit: AccountResourceLimit
    @Struct.field('uint64') declare ram_usage: UInt64
    @Struct.field(AccountPermission, {array: true}) declare permissions: AccountPermission[]
    @Struct.field(AccountTotalResources, {optional: true})
    declare total_resources: AccountTotalResources
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

@Struct.type('account_by_authorizers_row')
export class AccountByAuthorizersRow extends Struct {
    @Struct.field(Name) declare account_name: Name
    @Struct.field(Name) declare permission_name: Name
    @Struct.field(PublicKey, {optional: true}) declare authorizing_key: PublicKey
    @Struct.field(PermissionLevel, {optional: true}) declare authorizing_account: PermissionLevel
    @Struct.field(Weight) declare weight: Weight
    @Struct.field(UInt32) declare threshold: UInt32
}

@Struct.type('account_by_authorizers')
export class AccountsByAuthorizers extends Struct {
    @Struct.field(AccountByAuthorizersRow, {array: true})
    declare accounts: AccountByAuthorizersRow[]
}

@Struct.type('new_producers_entry')
export class NewProducersEntry extends Struct {
    @Struct.field('name') declare producer_name: Name
    @Struct.field('public_key') declare block_signing_key: PublicKey
}

@Struct.type('new_producers')
export class NewProducers extends Struct {
    @Struct.field('uint32') declare version: UInt32
    @Struct.field(NewProducersEntry, {array: true}) declare producers: NewProducersEntry
}

@Struct.type('block_extension')
export class BlockExtension extends Struct {
    @Struct.field('uint16') declare type: UInt16
    @Struct.field('bytes') declare data: Bytes
}

@Struct.type('header_extension')
export class HeaderExtension extends Struct {
    @Struct.field('uint16') declare type: UInt16
    @Struct.field('bytes') declare data: Bytes
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
            switch (this.extra.compression) {
                case 'zlib': {
                    const inflated = pako.inflate(Bytes.from(this.extra.packed_trx, 'hex').array)
                    return Serializer.decode({data: inflated, type: Transaction})
                }
                case 'none': {
                    return Serializer.decode({data: this.extra.packed_trx, type: Transaction})
                }
                default: {
                    throw new Error(`Unsupported compression type ${this.extra.compression}`)
                }
            }
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
    @Struct.field(TrxVariant) declare trx: TrxVariant

    get id(): Checksum256 {
        return this.trx.id
    }
}

@Struct.type('get_block_response')
export class GetBlockResponse extends Struct {
    @Struct.field('time_point') declare timestamp: TimePoint
    @Struct.field('name') declare producer: Name
    @Struct.field('uint16') declare confirmed: UInt16
    @Struct.field(BlockId) declare previous: BlockId
    @Struct.field('checksum256') declare transaction_mroot: Checksum256
    @Struct.field('checksum256') declare action_mroot: Checksum256
    @Struct.field('uint32') declare schedule_version: UInt32
    @Struct.field(NewProducers, {optional: true}) new_producers?: NewProducers
    @Struct.field('header_extension', {optional: true}) header_extensions?: HeaderExtension[]
    @Struct.field('any', {optional: true}) new_protocol_features?: any
    @Struct.field('signature') declare producer_signature: Signature
    @Struct.field(GetBlockResponseTransactionReceipt, {array: true})
    declare transactions: GetBlockResponseTransactionReceipt[]
    @Struct.field('block_extension', {optional: true}) declare block_extensions: BlockExtension[]
    @Struct.field(BlockId) declare id: BlockId
    @Struct.field('uint32') declare block_num: UInt32
    @Struct.field('uint32') declare ref_block_prefix: UInt32
}

@Struct.type('get_block_response')
export class GetBlockInfoResponse extends Struct {
    @Struct.field('uint32') declare block_num: UInt32
    @Struct.field('uint32') declare ref_block_num: UInt16
    @Struct.field(BlockId) declare id: BlockId
    @Struct.field('time_point') declare timestamp: TimePoint
    @Struct.field('name') declare producer: Name
    @Struct.field('uint16') declare confirmed: UInt16
    @Struct.field(BlockId) declare previous: BlockId
    @Struct.field('checksum256') declare transaction_mroot: Checksum256
    @Struct.field('checksum256') declare action_mroot: Checksum256
    @Struct.field('uint32') declare schedule_version: UInt32
    @Struct.field('signature') declare producer_signature: Signature
    @Struct.field('uint32') declare ref_block_prefix: UInt32
}

@Struct.type('active_schedule_producer_authority')
export class ActiveScheduleProducerAuthority extends Struct {
    @Struct.field('name') declare producer_name: Name
    @Struct.field('any') declare authority: any
}

@Struct.type('active_schedule_producer')
export class ActiveScheduleProducer extends Struct {
    @Struct.field('name') declare producer_name: Name
    @Struct.field(ActiveScheduleProducerAuthority)
    declare authority: ActiveScheduleProducerAuthority
}

@Struct.type('active_schedule')
export class ActiveSchedule extends Struct {
    @Struct.field('uint32') declare version: UInt32
    @Struct.field(ActiveScheduleProducer, {array: true}) declare producers: ActiveScheduleProducer[]
}

@Struct.type('block_state_header')
export class BlockStateHeader extends Struct {
    @Struct.field('time_point') declare timestamp: TimePoint
    @Struct.field('name') declare producer: Name
    @Struct.field('uint16') declare confirmed: UInt16
    @Struct.field(BlockId) declare previous: BlockId
    @Struct.field('checksum256') declare transaction_mroot: Checksum256
    @Struct.field('checksum256') declare action_mroot: Checksum256
    @Struct.field('uint32') declare schedule_version: UInt32
    @Struct.field(HeaderExtension, {array: true, optional: true})
    header_extensions?: HeaderExtension[]
    @Struct.field('signature') declare producer_signature: Signature
}

@Struct.type('get_block_header_state_response')
export class GetBlockHeaderStateResponse extends Struct {
    @Struct.field('uint32') declare block_num: UInt32
    @Struct.field('uint32') declare dpos_proposed_irreversible_blocknum: UInt32
    @Struct.field('uint32') declare dpos_irreversible_blocknum: UInt32
    @Struct.field(BlockId) declare id: BlockId
    @Struct.field(BlockStateHeader) declare header: BlockStateHeader
    /** Unstructured any fields specific to header state calls */
    @Struct.field('any') declare active_schedule: any
    @Struct.field('any') declare blockroot_merkle: any
    @Struct.field('any') declare producer_to_last_produced: any
    @Struct.field('any') declare producer_to_last_implied_irb: any
    @Struct.field('any') declare valid_block_signing_authority: any
    @Struct.field('any') declare confirm_count: any
    @Struct.field('any') declare pending_schedule: any
    @Struct.field('any') declare activated_protocol_features: any
    @Struct.field('any') declare additional_signatures: any
}

@Struct.type('get_info_response')
export class GetInfoResponse extends Struct {
    /** Hash representing the last commit in the tagged release. */
    @Struct.field('string') declare server_version: string
    /** Hash representing the ID of the chain. */
    @Struct.field('checksum256') declare chain_id: Checksum256
    /** Highest block number on the chain */
    @Struct.field('uint32') declare head_block_num: UInt32
    /** Highest block number on the chain that has been irreversibly applied to state. */
    @Struct.field('uint32') declare last_irreversible_block_num: UInt32
    /** Highest block ID on the chain that has been irreversibly applied to state. */
    @Struct.field(BlockId) declare last_irreversible_block_id: BlockId
    /** Highest block ID on the chain. */
    @Struct.field(BlockId) declare head_block_id: BlockId
    /** Highest block unix timestamp. */
    @Struct.field('time_point') declare head_block_time: TimePoint
    /** Producer that signed the highest block (head block). */
    @Struct.field('name') declare head_block_producer: Name
    /** CPU limit calculated after each block is produced, approximately 1000 times `blockCpuLimit`. */
    @Struct.field('uint64') declare virtual_block_cpu_limit: UInt64
    /** NET limit calculated after each block is produced, approximately 1000 times `blockNetLimit`. */
    @Struct.field('uint64') declare virtual_block_net_limit: UInt64
    /** Actual maximum CPU limit. */
    @Struct.field('uint64') declare block_cpu_limit: UInt64
    /** Actual maximum NET limit. */
    @Struct.field('uint64') declare block_net_limit: UInt64
    /** String representation of server version. */
    @Struct.field('string?') server_version_string?: string
    /** Sequential block number representing the best known head in the fork database tree. */
    @Struct.field('uint32?') fork_db_head_block_num?: UInt32
    /** Hash representing the best known head in the fork database tree. */
    @Struct.field('block_id_type?') fork_db_head_block_id?: BlockId

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

export interface SendTransactionResponseExceptionStack {
    context: {
        level: string
        file: string
        line: number
        method: string
        hostname: string
        thread_name: string
        timestamp: string
    }
    format: string
    data: any
}

export interface SendTransactionResponseException {
    code: number
    name: string
    message: string
    stack: SendTransactionResponseExceptionStack[]
}

export interface SendTransactionResponse {
    transaction_id: string
    processed: {
        id: string
        block_num: number
        block_time: string
        receipt: {status: string; cpu_usage_us: number; net_usage_words: number}
        elapsed: number
        except?: SendTransactionResponseException
        net_usage: number
        scheduled: boolean
        action_traces: any[]
        account_ram_delta: any
    }
}

export interface SendTransaction2Options {
    return_failure_trace?: boolean
    retry_trx?: boolean
    retry_trx_num_blocks?: number
}

export interface SendTransaction2Response {
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
    @Struct.field('name') declare code: Name
    @Struct.field('name') declare scope: Name
    @Struct.field('name') declare table: Name
    @Struct.field('name') declare payer: Name
    @Struct.field('uint32') declare count: UInt32
}

@Struct.type('get_table_by_scope_response')
export class GetTableByScopeResponse extends Struct {
    @Struct.field(GetTableByScopeResponseRow, {array: true})
    declare rows: GetTableByScopeResponseRow[]
    @Struct.field('string') declare more: string
}

@Struct.type('ordered_action_result')
export class OrderedActionsResult extends Struct {
    @Struct.field(UInt64) declare global_action_seq: UInt64
    @Struct.field(Int64) declare account_action_seq: Int64
    @Struct.field(UInt32) declare block_num: UInt32
    @Struct.field(BlockTimestamp) declare block_time: BlockTimestamp
    @Struct.field('any') action_trace?: any
    @Struct.field('boolean?') irrevirsible?: boolean
}

@Struct.type('get_actions_response')
export class GetActionsResponse extends Struct {
    @Struct.field(OrderedActionsResult, {array: true}) declare actions: OrderedActionsResult[]
    @Struct.field(Int32) declare last_irreversible_block: Int32
    @Struct.field(Int32) declare head_block_num: Int32
    @Struct.field('boolean?') time_limit_exceeded_error?: boolean
}

@Struct.type('transaction_trace')
export class TransactionTrace extends Struct {}

@Struct.type('trx')
export class Trx extends Struct {
    @Struct.field('any') declare actions: AnyAction[]
    @Struct.field('any') declare context_free_actions: AnyAction[]
    @Struct.field('any') declare context_free_data: any[]
    @Struct.field('number') declare delay_sec: number
    @Struct.field('string') declare expiration: string
    @Struct.field('number') declare max_cpu_usage_ms: number
    @Struct.field('number') declare max_net_usage_words: number
    @Struct.field('number') declare ref_block_num: number
    @Struct.field('number') declare ref_block_prefix: number
    @Struct.field('string', {array: true}) declare signatures: string[]
}

@Struct.type('transaction_info')
export class TransactionInfo extends Struct {
    @Struct.field(TransactionReceipt) declare receipt: TransactionReceipt
    @Struct.field('trx') declare trx: Trx
}

@Struct.type('get_transaction_response')
export class GetTransactionResponse extends Struct {
    @Struct.field(Checksum256) declare id: Checksum256
    @Struct.field(UInt32) declare block_num: UInt32
    @Struct.field(BlockTimestamp) declare block_time: BlockTimestamp
    @Struct.field(UInt32) declare last_irreversible_block: UInt32
    @Struct.field('any?') traces?: TransactionTrace[]
    @Struct.field('any') declare trx: TransactionInfo
}

@Struct.type('get_key_accounts_response')
export class GetKeyAccountsResponse extends Struct {
    @Struct.field('name', {array: true}) declare account_names: Name[]
}

@Struct.type('get_controlled_accounts_response')
export class GetControlledAccountsResponse extends Struct {
    @Struct.field('name', {array: true}) declare controlled_accounts: Name[]
}

export interface GetCurrencyStatsResponse {
    [key: string]: GetCurrencyStatsItemResponse
}

@Struct.type('get_currency_stats_item_response')
export class GetCurrencyStatsItemResponse extends Struct {
    @Struct.field('asset') declare supply: Asset
    @Struct.field('asset') declare max_supply: Asset
    @Struct.field('name') declare issuer: Name
}

@Struct.type('get_transaction_status_response')
export class GetTransactionStatusResponse extends Struct {
    @Struct.field('string') declare state: string
    @Struct.field('uint32') declare head_number: UInt32
    @Struct.field(BlockId) declare head_id: BlockId
    @Struct.field('time_point') declare head_timestamp: TimePoint
    @Struct.field('uint32') declare irreversible_number: UInt32
    @Struct.field(BlockId) declare irreversible_id: BlockId
    @Struct.field('time_point') declare irreversible_timestamp: TimePoint
    @Struct.field(BlockId) declare earliest_tracked_block_id: BlockId
    @Struct.field('uint32') declare earliest_tracked_block_number: UInt32
}

@Struct.type('producer_authority')
export class ProducerAuthority extends Struct {
    @Struct.field(UInt32) threshold!: UInt32
    @Struct.field(KeyWeight, {array: true}) keys!: KeyWeight[]
}

export type ProducerEntry = [number, ProducerAuthority]

@Struct.type('producer')
export class Producer extends Struct {
    @Struct.field('name') declare producer_name: Name
    @Struct.field('any', {array: true}) declare authority: ProducerEntry

    static from(data: any) {
        return super.from({
            ...data,
            authority: [data.authority[0], ProducerAuthority.from(data.authority[1])],
        })
    }
}

@Struct.type('producer_schedule')
export class ProducerSchedule extends Struct {
    @Struct.field('uint32') declare version: UInt32
    @Struct.field(Producer, {array: true}) declare producers: Producer[]
}

@Struct.type('get_producer_schedule_response')
export class GetProducerScheduleResponse extends Struct {
    @Struct.field(ProducerSchedule, {optional: true}) declare active: ProducerSchedule
    @Struct.field(ProducerSchedule, {optional: true}) declare pending: ProducerSchedule
    @Struct.field(ProducerSchedule, {optional: true}) declare proposed: ProducerSchedule
}

@Struct.type('protocol_feature')
export class ProtocolFeature extends Struct {
    @Struct.field('checksum256') declare feature_digest: Checksum256
    @Struct.field('uint32') declare activation_ordinal: UInt32
    @Struct.field('uint32') declare activation_block_num: UInt32
    @Struct.field('checksum256') declare description_digest: Checksum256
    @Struct.field('string', {array: true}) declare dependencies: string[]
    @Struct.field('string') declare protocol_feature_type: string
    @Struct.field('any', {array: true}) declare specification: any[]
}

@Struct.type('get_protocol_features_response')
export class GetProtocolFeaturesResponse extends Struct {
    @Struct.field(ProtocolFeature, {array: true})
    declare activated_protocol_features: ProtocolFeature[]
    @Struct.field('uint32', {optional: true}) declare more: UInt32
}

export interface GetProtocolFeaturesParams {
    /** Lower lookup bound. */
    lower_bound?: UInt32 | number
    /** Upper lookup bound. */
    upper_bound?: UInt32 | number
    /** How many rows to fetch, defaults to 10 if unset. */
    limit?: UInt32Type
    /** Flag to indicate it is has to search by block number */
    search_by_block_num?: boolean
    /** Whether to iterate records in reverse order. */
    reverse?: boolean
}

export interface GetAccountsByAuthorizersParams {
    accounts?: NameType[]
    keys?: PublicKeyType[]
}
