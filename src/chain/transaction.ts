import {Action, ActionType, AnyAction} from './action'
import {Bytes, BytesType} from './bytes'
import {Checksum256} from './checksum'
import {IntType, UInt16, UInt32, UInt8, VarUInt} from './integer'
import {Struct, StructConstructor} from './struct'
import {TimePointSec, TimePointType} from './time'

import {encode} from '../serializer/encoder'
import {Signature, SignatureType} from './signature'
import {decode} from '../serializer/decoder'
import {ABIDef} from './abi'
import {Name, NameType} from './name'

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

    static from<T extends StructConstructor>(
        this: T,
        object: TransactionHeaderType
    ): InstanceType<T> {
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

export interface AnyTransaction extends TransactionHeaderFields {
    /** The context free actions in the transaction. */
    context_free_actions?: AnyAction[]
    /** The actions in the transaction. */
    actions?: AnyAction[]
    /** Transaction extensions. */
    transaction_extensions?: {type: IntType; data: BytesType}[]
}

export type TransactionType = Transaction | TransactionFields

@Struct.type('transaction')
export class Transaction extends TransactionHeader {
    /** The context free actions in the transaction. */
    @Struct.field(Action, {array: true, default: []}) context_free_actions!: Action[]
    /** The actions in the transaction. */
    @Struct.field(Action, {array: true, default: []}) actions!: Action[]
    /** Transaction extensions. */
    @Struct.field(Action, {array: true, default: []})
    transaction_extensions!: TransactionExtension[]

    static from(
        object: TransactionType | AnyTransaction,
        abis?: ABIDef | {contract: NameType; abi: ABIDef}[]
    ) {
        const abiFor = (contract: NameType) => {
            if (!abis) {
                return
            } else if (Array.isArray(abis)) {
                return abis
                    .filter((abi) => Name.from(abi.contract).equals(contract))
                    .map(({abi}) => abi)[0]
            } else {
                return abis
            }
        }
        const resolveAction = (action: AnyAction) => Action.from(action, abiFor(action.account))
        const actions = (object.actions || []).map(resolveAction)
        const context_free_actions = (object.context_free_actions || []).map(resolveAction)
        const transaction = {
            ...object,
            context_free_actions,
            actions,
        }
        return super.from(transaction) as Transaction
    }

    /** Return true if this transaction is equal to given transaction. */
    equals(other: TransactionType) {
        const tx = Transaction.from(other)
        return this.id.equals(tx.id)
    }

    get id(): Checksum256 {
        return encode({object: this}).sha256Digest
    }

    signingDigest(chainId: Checksum256): Checksum256 {
        let data = Bytes.from(chainId.array)
        data = data.appending(encode({object: this}))
        data = data.appending(new Uint8Array(32))
        return data.sha256Digest
    }
}

export interface SignedTransactionFields extends TransactionFields {
    /** List of signatures. */
    signatures?: SignatureType[]
    /** Context-free action data, for each context-free action, there is an entry here. */
    context_free_data?: BytesType[]
}

export type SignedTransactionType = SignedTransaction | SignedTransactionFields

@Struct.type('signed_transaction')
export class SignedTransaction extends Transaction {
    /** List of signatures. */
    @Struct.field('signature[]', {default: []}) signatures!: Signature[]
    /** Context-free action data, for each context-free action, there is an entry here. */
    @Struct.field('bytes[]', {default: []}) context_free_data!: Bytes[]

    static from<T extends StructConstructor>(
        this: T,
        object: SignedTransactionType
    ): InstanceType<T> {
        return super.from(object) as InstanceType<T>
    }
}

@Struct.type('packed_transaction')
export class PackedTransaction extends Struct {
    @Struct.field('signature[]') signatures!: Signature[]
    @Struct.field('uint8', {default: 0}) compression!: UInt8
    @Struct.field('bytes') packed_context_free_data!: Bytes
    @Struct.field('bytes') packed_trx!: Bytes

    static fromSigned(signed: SignedTransaction) {
        const tx = Transaction.from(signed)
        return this.from({
            signatures: signed.signatures,
            packed_context_free_data: encode({object: signed.context_free_data, type: 'bytes[]'}),
            packed_trx: encode({object: tx}),
        })
    }

    getTransaction(): Transaction {
        if (this.compression.value !== 0) {
            throw new Error('Transaction compression not supported yet')
        }
        return decode({data: this.packed_trx, type: Transaction}) as Transaction
    }

    getSignedTransaction(): SignedTransaction {
        const transaction = this.getTransaction()
        // TODO: decode context free data
        return SignedTransaction.from({
            ...transaction,
            signatures: this.signatures,
        })
    }
}
