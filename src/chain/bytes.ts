import {ABISerializable} from '../serializer/serializable'
import {ABIEncoder} from '../serializer/encoder'
import {ABIDecoder} from '../serializer/decoder'
import {arrayEquals} from '../utils'

export type BytesType = Bytes | Uint8Array | ArrayLike<number> | string

export type BytesEncoding = 'hex' | 'utf8'

export class Bytes implements ABISerializable {
    static abiName = 'bytes'

    static from(value: BytesType, encoding?: BytesEncoding): Bytes {
        if (value instanceof Bytes) {
            return value
        }
        if (typeof value === 'string') {
            return Bytes.fromString(value, encoding)
        }
        if (value instanceof Uint8Array) {
            return new Bytes(value)
        }
        return new Bytes(new Uint8Array(value))
    }

    static fromString(value: string, encoding: BytesEncoding = 'hex') {
        if (encoding === 'hex') {
            const array = hexToArray(value)
            return new Bytes(array)
        } else if (encoding == 'utf8') {
            const encoder = new TextEncoder()
            return new Bytes(encoder.encode(value))
        } else {
            throw new Error(`Unknown encoding: ${encoding}`)
        }
    }

    static fromABI(decoder: ABIDecoder): Bytes {
        const len = decoder.readVaruint32()
        return new Bytes(decoder.readArray(len))
    }

    static equal(a: BytesType, b: BytesType): boolean {
        return Bytes.from(a).equals(Bytes.from(b))
    }

    array: Uint8Array

    constructor(array: Uint8Array) {
        this.array = array
    }

    get data(): DataView {
        return new DataView(this.array.buffer)
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
        encoder.writeBytes(this.array)
    }

    toJSON() {
        return this.hexString
    }
}

let hexLookup: string[] | undefined
function arrayToHex(array: Uint8Array) {
    if (!hexLookup) {
        hexLookup = new Array<string>(0xff)
        for (let i = 0; i <= 0xff; ++i) {
            hexLookup[i] = i.toString(16).padStart(2, '0')
        }
    }
    const len = array.byteLength
    const rv = new Array<string>(len)
    for (let i = 0; i < array.byteLength; ++i) {
        rv[i] = hexLookup[array[i]]
    }
    return rv.join('')
}

function hexToArray(hex: string) {
    if (typeof hex !== 'string') {
        throw new Error('Expected string containing hex digits')
    }
    if (hex.length % 2) {
        throw new Error('Odd number of hex digits')
    }
    const l = hex.length / 2
    const result = new Uint8Array(l)
    for (let i = 0; i < l; ++i) {
        const x = parseInt(hex.substr(i * 2, 2), 16)
        if (Number.isNaN(x)) {
            throw new Error('Expected hex string')
        }
        result[i] = x
    }
    return result
}
