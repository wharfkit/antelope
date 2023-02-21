import {
    Bytes,
    Checksum256,
    Int16,
    Int64,
    Name,
    PackedTransaction,
    PublicKey,
    Signature,
    Struct,
    UInt16,
    UInt32,
    UInt8,
    Variant,
    VarUInt,
} from '../chain'

import {Serializer} from '../serializer'

@Struct.type('handshake_message')
export class HandshakeMessage extends Struct {
    @Struct.field('uint16') declare networkVersion: UInt16
    @Struct.field('checksum256') declare chainId: Checksum256
    @Struct.field('checksum256') declare nodeId: Checksum256
    @Struct.field('public_key') declare key: PublicKey
    @Struct.field('int64') declare time: Int64
    @Struct.field('checksum256') declare token: Checksum256
    @Struct.field('signature') declare sig: Signature
    @Struct.field('string') declare p2pAddress: string
    @Struct.field('uint32') declare lastIrreversibleBlockNumber: UInt32
    @Struct.field('checksum256') declare lastIrreversibleBlockId: Checksum256
    @Struct.field('uint32') declare headNum: UInt32
    @Struct.field('checksum256') declare headId: Checksum256
    @Struct.field('string') declare os: string
    @Struct.field('string') declare agent: string
    @Struct.field('int16') declare generation: Int16
}

@Struct.type('chain_size_message')
export class ChainSizeMessage extends Struct {
    @Struct.field('uint32') declare lastIrreversibleBlockNumber: UInt32
    @Struct.field('checksum256') declare lastIrreversibleBlockId: Checksum256
    @Struct.field('uint32') declare headNum: UInt32
    @Struct.field('checksum256') declare headId: Checksum256
}

@Struct.type('go_away_message')
export class GoAwayMessage extends Struct {
    @Struct.field('uint8') declare reason: UInt8
    @Struct.field('checksum256') declare nodeId: Checksum256
}

@Struct.type('time_message')
export class TimeMessage extends Struct {
    @Struct.field('int64') declare org: Int64
    @Struct.field('int64') declare rec: Int64
    @Struct.field('int64') declare xmt: Int64
    @Struct.field('int64') declare dst: Int64
}

@Struct.type('notice_message')
export class NoticeMessage extends Struct {
    @Struct.field('checksum256', {array: true}) declare knownTrx: Checksum256[]
    @Struct.field('checksum256', {array: true}) declare knownBlocks: Checksum256[]
}

@Struct.type('request_message')
export class RequestMessage extends Struct {
    @Struct.field('checksum256', {array: true}) declare reqTrx: Checksum256[]
    @Struct.field('checksum256', {array: true}) declare reqBlocks: Checksum256[]
}

@Struct.type('sync_request_message')
export class SyncRequestMessage extends Struct {
    @Struct.field('uint32') declare startBlock: UInt32
    @Struct.field('uint32') declare endBlock: UInt32
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

@Variant.type('trx_variant', [Checksum256, PackedTransaction])
class TrxVariant extends Variant {
    declare value: Checksum256 | PackedTransaction
}

@Struct.type('full_transaction_receipt')
export class FullTransactionReceipt extends Struct {
    @Struct.field(UInt8) declare status: UInt8
    @Struct.field(UInt32) declare cpu_usage_us: UInt32
    @Struct.field(VarUInt) declare net_usage_words: VarUInt
    @Struct.field(TrxVariant) declare trx: TrxVariant
}

@Struct.type('block_header')
export class BlockHeader extends Struct {
    @Struct.field('uint32') declare timeSlot: UInt32
    @Struct.field('name') declare producer: Name
    @Struct.field('uint16') declare confirmed: UInt16
    @Struct.field('checksum256') declare previous: Checksum256
    @Struct.field('checksum256') declare transaction_mroot: Checksum256
    @Struct.field('checksum256') declare action_mroot: Checksum256
    @Struct.field('uint32') declare schedule_version: UInt32
    @Struct.field(NewProducers, {optional: true}) new_producers?: NewProducers
    @Struct.field(HeaderExtension, {array: true}) declare header_extensions: HeaderExtension[]

    get blockNum(): number {
        const bytes = this.previous.array.slice(0, 4)
        let num = 0
        for (let i = 0; i < 4; i++) {
            num = (num << 8) + bytes[i]
        }
        return num + 1
    }

    get id(): Checksum256 {
        const id = Checksum256.hash(Serializer.encode({object: this, type: BlockHeader}))
        const numBuffer = new Uint8Array(4)
        numBuffer[0] = (this.blockNum >> 24) & 0xff
        numBuffer[1] = (this.blockNum >> 16) & 0xff
        numBuffer[2] = (this.blockNum >> 8) & 0xff
        numBuffer[3] = this.blockNum & 0xff
        id.array.set(numBuffer, 0)
        return id
    }
}

@Struct.type('signed_block')
export class SignedBlock extends BlockHeader {
    @Struct.field('signature') declare producer_signature: Signature
    @Struct.field(FullTransactionReceipt, {array: true})
    declare transactions: FullTransactionReceipt[]
    @Struct.field(BlockExtension, {array: true}) declare block_extensions: BlockExtension[]
}

@Variant.type('net_message', [
    HandshakeMessage,
    ChainSizeMessage,
    GoAwayMessage,
    TimeMessage,
    NoticeMessage,
    RequestMessage,
    SyncRequestMessage,
    SignedBlock,
    PackedTransaction,
])
export class NetMessage extends Variant {
    declare value:
        | HandshakeMessage
        | ChainSizeMessage
        | GoAwayMessage
        | TimeMessage
        | NoticeMessage
        | RequestMessage
        | SyncRequestMessage
        | SignedBlock
        | PackedTransaction
}
