import {ABISerializable} from '../serializer/serializable'
import {ABIEncoder} from '../serializer/encoder'

export type BytesType = Bytes | Uint8Array | string

export class Bytes implements ABISerializable {
    static abiName = 'bytes'

    static from(value: BytesType): Bytes {
        if (value instanceof Bytes) {
            return value
        }
        if (typeof value === 'string') {
            const array = hexToArray(value)
            return new Bytes(array)
        }
        return new Bytes(value)
    }

    static fromABI(): Bytes {
        throw new Error('Not implemented')
    }

    array: Uint8Array

    get data(): DataView {
        return new DataView(this.array.buffer)
    }

    get hexString(): string {
        return arrayToHex(this.array)
    }

    constructor(array: Uint8Array) {
        this.array = array
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
