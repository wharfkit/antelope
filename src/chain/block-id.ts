import {Bytes, BytesType, Checksum256, Checksum256Type, isInstanceOf, UInt32, UInt32Type} from '..'
import {ABIDecoder, ABIEncoder, ABISerializableObject} from '../serializer'
import {arrayEquals, arrayToHex} from '../utils'

export type BlockIdType = BlockId | BytesType | {blockNum: UInt32Type; checksum: Checksum256Type}

export class BlockId implements ABISerializableObject {
    static abiName = 'block_id_type' // eosio contract context defines this with a _type suffix for some reason

    static from(value: BlockIdType) {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (Bytes.isBytes(value)) {
            return new this(Bytes.from(value).array)
        } else {
            return this.fromBlockChecksum(value.checksum, value.blockNum)
        }
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(decoder.readArray(32))
    }

    static fromBlockChecksum(checksum: Checksum256Type, blockNum: UInt32Type): BlockId {
        const id = new BlockId(Checksum256.from(checksum).array)
        const numBuffer = new Uint8Array(4)
        numBuffer[0] = (Number(blockNum) >> 24) & 0xff
        numBuffer[1] = (Number(blockNum) >> 16) & 0xff
        numBuffer[2] = (Number(blockNum) >> 8) & 0xff
        numBuffer[3] = Number(blockNum) & 0xff
        id.array.set(numBuffer, 0)
        return id
    }

    readonly array: Uint8Array

    constructor(array: Uint8Array) {
        if (array.byteLength !== 32) {
            throw new Error(`BlockId size mismatch, expected 32 bytes got ${array.byteLength}`)
        }
        this.array = array
    }

    equals(other: BlockIdType): boolean {
        const self = this.constructor as typeof BlockId
        try {
            return arrayEquals(this.array, self.from(other).array)
        } catch {
            return false
        }
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeArray(this.array)
    }

    toString() {
        return this.hexString
    }

    toJSON() {
        return this.toString()
    }

    get hexString(): string {
        return arrayToHex(this.array)
    }

    get blockNum(): UInt32 {
        const bytes = this.array.slice(0, 4)
        let num = 0
        for (let i = 0; i < 4; i++) {
            num = (num << 8) + bytes[i]
        }
        return UInt32.from(num)
    }
}
