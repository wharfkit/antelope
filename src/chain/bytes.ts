import {ABISerializableObject} from '../serializer/serializable'
import {ABIEncoder} from '../serializer/encoder'
import {ABIDecoder} from '../serializer/decoder'
import {arrayEquals, arrayToHex, hexToArray, isInstanceOf, secureRandom} from '../utils'

export type BytesType = Bytes | Uint8Array | ArrayLike<number> | string

export type BytesEncoding = 'hex' | 'utf8'

export class Bytes implements ABISerializableObject {
    static abiName = 'bytes'

    static from(value: BytesType, encoding?: BytesEncoding): Bytes {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (typeof value === 'string') {
            return this.fromString(value, encoding)
        }
        if (isInstanceOf(value, Uint8Array)) {
            return new this(value)
        }
        return new this(new Uint8Array(value))
    }

    static fromString(value: string, encoding: BytesEncoding = 'hex') {
        if (encoding === 'hex') {
            const array = hexToArray(value)
            return new this(array)
        } else if (encoding == 'utf8') {
            const encoder = new TextEncoder()
            return new this(encoder.encode(value))
        } else {
            throw new Error(`Unknown encoding: ${encoding}`)
        }
    }

    static fromABI(decoder: ABIDecoder): Bytes {
        const len = decoder.readVaruint32()
        return new this(decoder.readArray(len))
    }

    static equal(a: BytesType, b: BytesType): boolean {
        return this.from(a).equals(this.from(b))
    }

    static random(length: number) {
        return new this(secureRandom(length))
    }

    /** Return true if given value is a valid `BytesType`. */
    static isBytes(value: any): value is BytesType {
        if (isInstanceOf(value, Bytes) || isInstanceOf(value, Uint8Array)) {
            return true
        }
        if (Array.isArray(value) && value.every((v) => typeof v === 'number')) {
            return true
        }
        if (typeof value === 'string' && (/[\da-f]/i.test(value) || value === '')) {
            return true
        }
        return false
    }

    array: Uint8Array

    constructor(array: Uint8Array = new Uint8Array()) {
        this.array = array
    }

    get hexString(): string {
        return arrayToHex(this.array)
    }

    get utf8String(): string {
        return new TextDecoder().decode(this.array)
    }

    appending(other: BytesType): Bytes {
        other = Bytes.from(other)
        const newSize = this.array.byteLength + other.array.byteLength
        const buffer = new ArrayBuffer(newSize)
        const array = new Uint8Array(buffer)
        array.set(this.array)
        array.set(other.array, this.array.byteLength)
        return new Bytes(array)
    }

    droppingFirst(n = 1) {
        return new Bytes(this.array.subarray(n))
    }

    copy(): Bytes {
        const buffer = new ArrayBuffer(this.array.byteLength)
        const array = new Uint8Array(buffer)
        array.set(this.array)
        return new Bytes(array)
    }

    equals(other: BytesType): boolean {
        return arrayEquals(this.array, Bytes.from(other).array)
    }

    toString(encoding: BytesEncoding = 'hex') {
        if (encoding === 'hex') {
            return this.hexString
        } else if (encoding === 'utf8') {
            return this.utf8String
        } else {
            throw new Error(`Unknown encoding: ${encoding}`)
        }
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeVaruint32(this.array.byteLength)
        encoder.writeArray(this.array)
    }

    toJSON() {
        return this.hexString
    }
}
