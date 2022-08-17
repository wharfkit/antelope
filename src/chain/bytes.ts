import {ABISerializableObject} from '../serializer/serializable'
import {ABIEncoder} from '../serializer/encoder'
import {ABIDecoder} from '../serializer/decoder'
import {arrayEquals, arrayToHex, hexToArray, isInstanceOf, secureRandom} from '../utils'

export type BytesType = Bytes | ArrayBufferView | ArrayBuffer | ArrayLike<number> | string

// This allows passing any object following the .array convention to a Bytes method
type AnyBytes = BytesType | {array: Uint8Array}

export type BytesEncoding = 'hex' | 'utf8'

export class Bytes implements ABISerializableObject {
    static abiName = 'bytes'

    /**
     * Create a new Bytes instance.
     * @note Make sure to take a [[copy]] before mutating the bytes as the underlying source is not copied here.
     */
    static from(value: AnyBytes, encoding?: BytesEncoding): Bytes {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (typeof value === 'string') {
            return this.fromString(value, encoding)
        }
        if (ArrayBuffer.isView(value)) {
            return new this(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
        }
        if (isInstanceOf(value['array'], Uint8Array)) {
            return new this(value['array'])
        }
        return new this(new Uint8Array(value as any))
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

    static abiDefault() {
        return new Bytes()
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

    /** Number of bytes in this instance. */
    get length(): number {
        return this.array.byteLength
    }

    /** Hex string representation of this instance. */
    get hexString(): string {
        return arrayToHex(this.array)
    }

    /** UTF-8 string representation of this instance. */
    get utf8String(): string {
        return new TextDecoder().decode(this.array)
    }

    /** Mutating. Append bytes to this instance. */
    append(other: AnyBytes) {
        other = Bytes.from(other)
        const newSize = this.array.byteLength + other.array.byteLength
        const buffer = new ArrayBuffer(newSize)
        const array = new Uint8Array(buffer)
        array.set(this.array)
        array.set(other.array, this.array.byteLength)
        this.array = array
    }

    /** Non-mutating, returns a copy of this instance with appended bytes. */
    appending(other: AnyBytes): Bytes {
        const rv = new Bytes(this.array)
        rv.append(other)
        return rv
    }

    /** Mutating. Pad this instance to length. */
    zeropad(n: number, truncate = false) {
        const newSize = truncate ? n : Math.max(n, this.array.byteLength)
        const buffer = new ArrayBuffer(newSize)
        const array = new Uint8Array(buffer)
        array.fill(0)
        if (truncate && this.array.byteLength > newSize) {
            array.set(this.array.slice(0, newSize), 0)
        } else {
            array.set(this.array, newSize - this.array.byteLength)
        }
        this.array = array
    }

    /** Non-mutating, returns a copy of this instance with zeros padded. */
    zeropadded(n: number, truncate = false) {
        const rv = new Bytes(this.array)
        rv.zeropad(n, truncate)
        return rv
    }

    /** Mutating. Drop bytes from the start of this instance. */
    dropFirst(n = 1) {
        this.array = this.array.subarray(n)
    }

    /** Non-mutating, returns a copy of this instance with dropped bytes from the start. */
    droppingFirst(n = 1) {
        return new Bytes(this.array.subarray(n))
    }

    copy(): Bytes {
        const buffer = new ArrayBuffer(this.array.byteLength)
        const array = new Uint8Array(buffer)
        array.set(this.array)
        return new Bytes(array)
    }

    equals(other: AnyBytes): boolean {
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
