import {Action, ActionType} from './action'
import {Bytes, BytesType} from './bytes'
import {Checksum256} from './checksum'
import {IntType, UInt16, UInt32, UInt8, VarUInt} from './integer'
import {Struct, StructConstructor} from './struct'
import {TimePointSec, TimePointType} from './time'

import {encode} from '../serializer/encoder'

@Struct.type('transaction_extension')
export class TransactionExtension extends Struct {
    @Struct.field('uint16') type!: UInt16
    @Struct.field('bytes') data!: Bytes
}

export interface TransactionHeaderFields {
    /** The time at which a transaction expires. */
    expiration: TimePointType
    /** *Specifies a block num in the last 2^16 blocks. */
    ref_block_num: IntType
    /** Specifies the lower 32 bits of the block id. */
    ref_block_prefix: IntType
    /** Upper limit on total network bandwidth (in 8 byte words) billed for this transaction. */
    max_net_usage_words?: IntType
    /** Upper limit on the total CPU time billed for this transaction. */
    max_cpu_usage_ms?: IntType
    /** Number of seconds to delay this transaction for during which it may be canceled. */
    delay_sec?: IntType
}

export type TransactionHeaderType = TransactionHeader | TransactionHeaderFields

@Struct.type('transaction_header')
export class TransactionHeader extends Struct {
    /** The time at which a transaction expires. */
    @Struct.field('time_point_sec') expiration!: TimePointSec
    /** *Specifies a block num in the last 2^16 blocks. */
    @Struct.field('uint16') ref_block_num!: UInt16
    /** Specifies the lower 32 bits of the block id. */
    @Struct.field('uint32') ref_block_prefix!: UInt32
    /** Upper limit on total network bandwidth (in 8 byte words) billed for this transaction. */
    @Struct.field('varuint32', {default: 0}) max_net_usage_words!: VarUInt
    /** Upper limit on the total CPU time billed for this transaction. */
    @Struct.field('uint8', {default: 0}) max_cpu_usage_ms!: UInt8
    /** Number of seconds to delay this transaction for during which it may be canceled. */
    @Struct.field('varuint32', {default: 0}) delay_sec!: VarUInt

    static from<T extends StructConstructor>(object: TransactionHeaderType): InstanceType<T> {
        return super.from(object) as InstanceType<T>
    }
}

export interface TransactionFields extends TransactionHeaderFields {
    /** The context free actions in the transaction. */
    context_free_actions?: ActionType[]
    /** The actions in the transaction. */
    actions?: ActionType[]
    /** Transaction extensions. */
    transaction_extensions?: {type: IntType; data: BytesType}[]
}

export type TransactionType = Transaction | TransactionHeaderFields

@Struct.type('transaction')
export class Transaction extends TransactionHeader {
    /** The context free actions in the transaction. */
    @Struct.field(Action, {array: true, default: []}) context_free_actions!: Action[]
    /** The actions in the transaction. */
    @Struct.field(Action, {array: true, default: []}) actions!: Action[]
    /** Transaction extensions. */
    @Struct.field(Action, {array: true, default: []})
    transaction_extensions!: TransactionExtension[]

    static from<T extends StructConstructor>(this: T, object: TransactionType): InstanceType<T> {
        return super.from(object) as InstanceType<T>
    }

    get id(): Checksum256 {
        return encode({object: this}).sha256Digest
    }
}
