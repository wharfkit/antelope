import {ripemd160, sha256, sha512} from 'hash.js'

import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {ABISerializableObject} from '../serializer/serializable'
import {arrayEquals, arrayToHex, isInstanceOf} from '../utils'

import {Bytes, BytesType} from '../'

type ChecksumType = Checksum | BytesType

class Checksum implements ABISerializableObject {
    static abiName = '__checksum'
    static byteSize: number

    static from<T extends typeof Checksum>(this: T, value: ChecksumType): InstanceType<T>
    static from(value: ChecksumType): unknown
    static from(value: ChecksumType) {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (isInstanceOf(value, Checksum)) {
            return new this(value.array)
        }
        return new this(Bytes.from(value).array)
    }

    static fromABI<T extends typeof Checksum>(this: T, decoder: ABIDecoder): InstanceType<T>
    static fromABI(decoder: ABIDecoder): unknown
    static fromABI(decoder: ABIDecoder) {
        return new this(decoder.readArray(this.byteSize))
    }

    static abiDefault<T extends typeof Checksum>(this: T): InstanceType<T>
    static abiDefault(): unknown
    static abiDefault() {
        return new this(new Uint8Array(this.byteSize))
    }

    readonly array: Uint8Array

    constructor(array: Uint8Array) {
        const byteSize = (this.constructor as typeof Checksum).byteSize
        if (array.byteLength !== byteSize) {
            throw new Error(
                `Checksum size mismatch, expected ${byteSize} bytes got ${array.byteLength}`
            )
        }
        this.array = array
    }

    equals(other: Checksum160Type | Checksum256Type | Checksum512Type): boolean {
        const self = this.constructor as typeof Checksum
        try {
            return arrayEquals(this.array, self.from(other).array)
        } catch {
            return false
        }
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

export type Checksum256Type = Checksum256 | BytesType
export class Checksum256 extends Checksum {
    static abiName = 'checksum256'
    static byteSize = 32

    static from(value: Checksum256Type) {
        return super.from(value) as Checksum256
    }

    static hash(data: BytesType): Checksum256 {
        const digest = new Uint8Array(sha256().update(Bytes.from(data).array).digest())
        return new Checksum256(digest)
    }
}

export type Checksum512Type = Checksum512 | BytesType
export class Checksum512 extends Checksum {
    static abiName = 'checksum512'
    static byteSize = 64

    static from(value: Checksum512Type) {
        return super.from(value) as Checksum512
    }

    static hash(data: BytesType): Checksum512 {
        const digest = new Uint8Array(sha512().update(Bytes.from(data).array).digest())
        return new Checksum512(digest)
    }
}

export type Checksum160Type = Checksum160 | BytesType
export class Checksum160 extends Checksum {
    static abiName = 'checksum160'
    static byteSize = 20

    static from(value: Checksum160Type) {
        return super.from(value) as Checksum160
    }

    static hash(data: BytesType): Checksum160 {
        const digest = new Uint8Array(ripemd160().update(Bytes.from(data).array).digest())
        return new Checksum160(digest)
    }
}
