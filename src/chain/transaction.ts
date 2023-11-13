import pako from 'pako'

import {abiEncode} from '../serializer/encoder'
import {Signature, SignatureType} from './signature'
import {abiDecode} from '../serializer/decoder'

import {
    ABIDef,
    Action,
    ActionType,
    AnyAction,
    Bytes,
    BytesType,
    Checksum256,
    Checksum256Type,
    Name,
    NameType,
    Struct,
    TimePointSec,
    TimePointType,
    UInt16,
    UInt16Type,
    UInt32,
    UInt32Type,
    UInt8,
    UInt8Type,
    VarUInt,
    VarUIntType,
} from '../'

@Struct.type('transaction_extension')
export class TransactionExtension extends Struct {
    @Struct.field('uint16') declare type: UInt16
    @Struct.field('bytes') declare data: Bytes
}

export interface TransactionHeaderFields {
    /** The time at which a transaction expires. */
    expiration: TimePointType
    /** *Specifies a block num in the last 2^16 blocks. */
    ref_block_num: UInt16Type
    /** Specifies the lower 32 bits of the block id. */
    ref_block_prefix: UInt32Type
    /** Upper limit on total network bandwidth (in 8 byte words) billed for this transaction. */
    max_net_usage_words?: VarUIntType
    /** Upper limit on the total CPU time billed for this transaction. */
    max_cpu_usage_ms?: UInt8Type
    /** Number of seconds to delay this transaction for during which it may be canceled. */
    delay_sec?: VarUIntType
}

export type TransactionHeaderType = TransactionHeader | TransactionHeaderFields

@Struct.type('transaction_header')
export class TransactionHeader extends Struct {
    /** The time at which a transaction expires. */
    @Struct.field('time_point_sec') declare expiration: TimePointSec
    /** *Specifies a block num in the last 2^16 blocks. */
    @Struct.field('uint16') declare ref_block_num: UInt16
    /** Specifies the lower 32 bits of the block id. */
    @Struct.field('uint32') declare ref_block_prefix: UInt32
    /** Upper limit on total network bandwidth (in 8 byte words) billed for this transaction. */
    @Struct.field('varuint32') declare max_net_usage_words: VarUInt
    /** Upper limit on the total CPU time billed for this transaction. */
    @Struct.field('uint8') declare max_cpu_usage_ms: UInt8
    /** Number of seconds to delay this transaction for during which it may be canceled. */
    @Struct.field('varuint32') declare delay_sec: VarUInt

    static from(object: TransactionHeaderType) {
        return super.from({
            max_net_usage_words: 0,
            max_cpu_usage_ms: 0,
            delay_sec: 0,
            ...object,
        }) as TransactionHeader
    }
}

export interface TransactionFields extends TransactionHeaderFields {
    /** The context free actions in the transaction. */
    context_free_actions?: ActionType[]
    /** The actions in the transaction. */
    actions?: ActionType[]
    /** Transaction extensions. */
    transaction_extensions?: {type: UInt16Type; data: BytesType}[]
}

export interface AnyTransaction extends TransactionHeaderFields {
    /** The context free actions in the transaction. */
    context_free_actions?: AnyAction[]
    /** The actions in the transaction. */
    actions?: AnyAction[]
    /** Transaction extensions. */
    transaction_extensions?: {type: UInt16Type; data: BytesType}[]
}

export type TransactionType = Transaction | TransactionFields

@Struct.type('transaction')
export class Transaction extends TransactionHeader {
    /** The context free actions in the transaction. */
    @Struct.field(Action, {array: true}) declare context_free_actions: Action[]
    /** The actions in the transaction. */
    @Struct.field(Action, {array: true}) declare actions: Action[]
    /** Transaction extensions. */
    @Struct.field(TransactionExtension, {array: true})
    declare transaction_extensions: TransactionExtension[]

    static from(
        object: TransactionType | AnyTransaction,
        abis?: ABIDef | {contract: NameType; abi: ABIDef}[]
    ): Transaction {
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
        const resolveAction = (action: AnyAction) => {
            if (action instanceof Action) {
                return action
            } else {
                return Action.from(action, abiFor(action.account))
            }
        }
        const actions = (object.actions || []).map(resolveAction)
        const context_free_actions = (object.context_free_actions || []).map(resolveAction)
        const transaction = {
            transaction_extensions: [],
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
        return Checksum256.hash(abiEncode({object: this}))
    }

    signingDigest(chainId: Checksum256Type): Checksum256 {
        const data = this.signingData(chainId)
        return Checksum256.hash(data)
    }

    signingData(chainId: Checksum256Type): Bytes {
        let data = Bytes.from(Checksum256.from(chainId).array)
        data = data.appending(abiEncode({object: this}))
        data = data.appending(new Uint8Array(32))
        return data
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
    @Struct.field('signature[]') declare signatures: Signature[]
    /** Context-free action data, for each context-free action, there is an entry here. */
    @Struct.field('bytes[]') declare context_free_data: Bytes[]

    /** The transaction without the signatures. */
    get transaction(): Transaction {
        return Transaction.from({
            ...this,
            signatures: undefined,
            context_free_data: undefined,
        })
    }

    get id(): Checksum256 {
        return this.transaction.id
    }

    static from(object: SignedTransactionType) {
        return super.from({
            signatures: [],
            context_free_data: [],
            ...object,
        }) as SignedTransaction
    }
}

export type PackedTransactionType =
    | PackedTransaction
    | {
          signatures?: SignatureType[]
          compression?: UInt8Type
          packed_context_free_data?: BytesType
          packed_trx: BytesType
      }

// reference: https://github.com/AntelopeIO/leap/blob/339d98eed107b9fd94736988996082c7002fa52a/libraries/chain/include/eosio/chain/transaction.hpp#L131-L134
export enum CompressionType {
    none = 0,
    zlib = 1,
}

@Struct.type('packed_transaction')
export class PackedTransaction extends Struct {
    @Struct.field('signature[]') declare signatures: Signature[]
    @Struct.field('uint8') declare compression: UInt8
    @Struct.field('bytes') declare packed_context_free_data: Bytes
    @Struct.field('bytes') declare packed_trx: Bytes

    static from(object: PackedTransactionType) {
        return super.from({
            signatures: [],
            packed_context_free_data: '',
            compression: 0,
            ...object,
        }) as PackedTransaction
    }

    static fromSigned(signed: SignedTransaction, compression: CompressionType = 1) {
        // Encode data
        let packed_trx: Bytes = abiEncode({object: Transaction.from(signed)})
        let packed_context_free_data: Bytes = abiEncode({
            object: signed.context_free_data,
            type: 'bytes[]',
        })
        switch (compression) {
            case CompressionType.zlib: {
                // compress data
                packed_trx = pako.deflate(packed_trx.array)
                packed_context_free_data = pako.deflate(packed_context_free_data.array)
                break
            }
            case CompressionType.none: {
                break
            }
        }
        return this.from({
            compression,
            signatures: signed.signatures,
            packed_context_free_data,
            packed_trx,
        }) as PackedTransaction
    }

    getTransaction(): Transaction {
        switch (Number(this.compression)) {
            // none
            case CompressionType.none: {
                return abiDecode({data: this.packed_trx, type: Transaction})
            }
            // zlib compressed
            case CompressionType.zlib: {
                const inflated = pako.inflate(this.packed_trx.array)
                return abiDecode({data: inflated, type: Transaction})
            }
            default: {
                throw new Error(`Unknown transaction compression ${this.compression}`)
            }
        }
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

@Struct.type('transaction_receipt')
export class TransactionReceipt extends Struct {
    @Struct.field('string') declare status: string
    @Struct.field('uint32') declare cpu_usage_us: UInt32
    @Struct.field('uint32') declare net_usage_words: UInt32
}
