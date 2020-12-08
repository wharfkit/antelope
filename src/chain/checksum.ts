import {ripemd160, sha256, sha512} from 'hash.js'

import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {ABISerializableObject} from '../serializer/serializable'

import {Bytes, BytesType} from './bytes'
import {arrayEquals, arrayToHex, isInstanceOf} from '../utils'

class Checksum implements ABISerializableObject {
    static abiName: string
    static byteSize: number

    static from(value: any) {
        if (isInstanceOf(value, Checksum)) {
            return new this(value.array)
        }
        return new this(Bytes.from(value).array)
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(decoder.readArray(this.byteSize))
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

    equals(other: Checksum160Type | Checksum256Type | Checksum512Type) {
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

export type Checksum256Type = Checksum256 | BytesType
export class Checksum256 extends Checksum {
    static abiName = 'checksum256'
    static byteSize = 32

    static from<T extends typeof Checksum256>(this: T, value: Checksum256Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
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

    static from<T extends typeof Checksum512>(this: T, value: Checksum512Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
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

    static from<T extends typeof Checksum160>(this: T, value: Checksum160Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }

    static hash(data: BytesType): Checksum160 {
        const digest = new Uint8Array(ripemd160().update(Bytes.from(data).array).digest())
        return new Checksum160(digest)
    }
}
