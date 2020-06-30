import {ripemd160, sha256, sha512} from 'hash.js'

import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {ABISerializableObject} from '../serializer/serializable'

import {Bytes, BytesType} from './bytes'
import {arrayEquals, arrayToHex} from '../utils'

export type ChecksumType = Checksum | BytesType

class Checksum implements ABISerializableObject {
    static byteSize: number

    static from<T extends typeof Checksum>(this: T, value: ChecksumType): InstanceType<T> {
        if (value instanceof this) {
            return value as InstanceType<T>
        }
        if (value instanceof Checksum) {
            return new this(value.array) as InstanceType<T>
        }
        return new this(Bytes.from(value).array) as InstanceType<T>
    }

    static fromABI<T extends typeof Checksum>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(decoder.readArray(this.byteSize)) as InstanceType<T>
    }

    array: Uint8Array

    constructor(array: Uint8Array) {
        const byteSize = (this.constructor as typeof Checksum).byteSize
        if (array.byteLength !== byteSize) {
            throw new Error(
                `Checksum size mismatch, expected ${byteSize} bytes got ${array.byteLength}`
            )
        }
        this.array = array
    }

    equals(other: ChecksumType) {
        const self = this.constructor as typeof Checksum
        return arrayEquals(this.array, self.from(other).array)
    }

    get hexString(): string {
        return arrayToHex(this.array)
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
}

export class Checksum256 extends Checksum {
    static abiName = 'checksum256'
    static byteSize = 32

    static hash(data: BytesType): Checksum256 {
        const digest = new Uint8Array(sha256().update(Bytes.from(data).array).digest())
        return new Checksum256(digest)
    }
}

export class Checksum512 extends Checksum {
    static abiName = 'checksum512'
    static byteSize = 64

    static hash(data: BytesType): Checksum512 {
        const digest = new Uint8Array(sha512().update(Bytes.from(data).array).digest())
        return new Checksum512(digest)
    }
}

export class Checksum160 extends Checksum {
    static abiName = 'checksum160'
    static byteSize = 20

    static hash(data: BytesType): Checksum160 {
        const digest = new Uint8Array(ripemd160().update(Bytes.from(data).array).digest())
        return new Checksum160(digest)
    }
}
