import {ABISerializableObject} from '../serializer/serializable'
import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {isInstanceOf, secureRandom} from '../utils'

import {Bytes, BytesType} from '../'

type FloatType = Float | number | string

const positiveInfinity = new Set(['inf', '+inf', 'infinity', '+infinity'])
const negativeInfinity = new Set(['-inf', '-infinity'])
const notANumber = new Set(['nan', '+nan', '-nan'])

// nodeos's default NaN carries the sign bit on every width (SoftFloat 8086-SSE).
function nanBytes(byteWidth: number, negative: boolean) {
    const bytes = new Uint8Array(byteWidth)
    const view = new DataView(bytes.buffer)
    if (byteWidth === 4) view.setFloat32(0, NaN, true)
    else view.setFloat64(0, NaN, true)
    if (negative) bytes[byteWidth - 1] |= 0x80
    return new Bytes(bytes)
}

function parseFloatText(text: string) {
    const word = text.trim().toLowerCase()
    if (positiveInfinity.has(word)) return Infinity
    if (negativeInfinity.has(word)) return -Infinity
    if (notANumber.has(word)) return NaN
    return Number.parseFloat(text)
}

class Float implements ABISerializableObject {
    static abiName = '__float'
    static byteWidth: number

    static from<T extends typeof Float>(this: T, value: FloatType): InstanceType<T>
    static from(value: FloatType): unknown
    static from(value: FloatType) {
        if (isInstanceOf(value, this)) {
            return value
        }
        let nanWord: string | undefined
        if (typeof value === 'string') {
            const word = value.trim().toLowerCase()
            if (notANumber.has(word)) nanWord = word
            value = parseFloatText(value)
        } else if (isInstanceOf(value, Float)) {
            value = value.value
        }
        const float = new this(value)
        if (nanWord) {
            float.data = nanBytes(this.byteWidth, nanWord === '-nan')
        }
        return float
    }

    static fromABI<T extends typeof Float>(this: T, decoder: ABIDecoder): InstanceType<T>
    static fromABI(decoder: ABIDecoder): unknown
    static fromABI(decoder: ABIDecoder) {
        const bytes = decoder.readArray(this.byteWidth)
        const view = new DataView(bytes.buffer, bytes.byteOffset, this.byteWidth)
        const value = this.byteWidth === 4 ? view.getFloat32(0, true) : view.getFloat64(0, true)
        const float = new this(value)
        if (Number.isNaN(value)) {
            float.data = new Bytes(bytes.slice())
        }
        return float
    }

    static abiDefault() {
        return this.from(0)
    }

    static random<T extends typeof Float>(this: T): InstanceType<T>
    static random(): unknown
    static random() {
        const bytes = secureRandom(this.byteWidth)
        const decoder = new ABIDecoder(bytes)
        return this.fromABI(decoder)
    }

    value: number

    /** Bytes this value decoded from, kept so a NaN survives engines that canonicalize it. */
    data?: Bytes

    constructor(value: number) {
        this.value = value
    }

    equals(other: FloatType) {
        const self = this.constructor as typeof Float
        return this.value === self.from(other).value
    }

    toABI(encoder: ABIEncoder) {
        const self = this.constructor as typeof Float
        if (Number.isNaN(this.value)) {
            encoder.writeArray((this.data || nanBytes(self.byteWidth, true)).array)
        } else {
            encoder.writeFloat(this.value, self.byteWidth)
        }
    }

    toString() {
        const self = this.constructor as typeof Float
        if (Number.isNaN(this.value)) {
            // A retained negative NaN keeps its sign in text, as nodeos renders it.
            const bytes = (this.data || nanBytes(self.byteWidth, true)).array
            return bytes[bytes.length - 1] & 0x80 ? '-nan' : 'nan'
        }
        if (this.value === Infinity) return 'inf'
        if (this.value === -Infinity) return '-inf'
        // Number.prototype.toString drops the sign of negative zero, which nodeos renders.
        return Object.is(this.value, -0) ? '-0' : this.value.toString()
    }

    toJSON() {
        return this.toString()
    }
}

export type Float32Type = Float32 | FloatType
export class Float32 extends Float {
    static abiName = 'float32'
    static byteWidth = 4
}

export type Float64Type = Float64 | FloatType
export class Float64 extends Float {
    static abiName = 'float64'
    static byteWidth = 8
}

export type Float128Type = Float128 | BytesType

// Only the text nodeos emits (std::fixed precision 17 or an inf/nan word) leaves the hex path.
const nodeosDecimal = /^[+-]?(\d+\.\d{17}|inf(inity)?|nan)$/i

export class Float128 implements ABISerializableObject {
    static abiName = 'float128'
    static byteWidth = 16

    static from(value: Float128Type) {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (typeof value === 'string') {
            if (value.startsWith('0x')) {
                value = value.slice(2)
            } else if (nodeosDecimal.test(value.trim())) {
                return this.fromDecimal(value)
            }
        }
        return new this(Bytes.from(value))
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(new Bytes(decoder.readArray(this.byteWidth)))
    }

    /** Widen a double to its exact binary128 bit pattern. */
    static fromDouble(value: number) {
        const view = new DataView(new ArrayBuffer(8))
        view.setFloat64(0, value)
        const high = view.getUint32(0)
        const low = view.getUint32(4)
        const sign = BigInt(high >>> 31)
        const exponent = (high >>> 20) & 0x7ff
        let mantissa = ((BigInt(high) & 0xfffffn) << 32n) | BigInt(low >>> 0)
        let exponent128: bigint
        if (exponent === 0x7ff) {
            exponent128 = 0x7fffn
            mantissa <<= 60n
        } else if (exponent === 0 && mantissa === 0n) {
            exponent128 = 0n
        } else if (exponent === 0) {
            let shift = 0n
            while ((mantissa & (1n << 52n)) === 0n) {
                mantissa <<= 1n
                shift++
            }
            mantissa = (mantissa & ((1n << 52n) - 1n)) << 60n
            exponent128 = BigInt(1 - 1023 + 16383) - shift
        } else {
            exponent128 = BigInt(exponent - 1023 + 16383)
            mantissa <<= 60n
        }
        let bits = (sign << 127n) | (exponent128 << 112n) | mantissa
        const bytes = new Uint8Array(16)
        for (let i = 0; i < 16; i++) {
            bytes[i] = Number(bits & 0xffn)
            bits >>= 8n
        }
        return new this(Bytes.from(bytes))
    }

    /** Decode the decimal text nodeos renders a float128 `next_key` as. */
    static fromDecimal(text: string) {
        const word = text.trim().toLowerCase()
        const value = parseFloatText(word)
        if (Number.isNaN(value) && !notANumber.has(word)) {
            throw new Error(`Invalid float128 decimal: ${text}`)
        }
        const result = this.fromDouble(value)
        if (word === '-nan') {
            result.data.array[15] |= 0x80
        }
        return result
    }

    static random() {
        const bytes = secureRandom(16)
        const decoder = new ABIDecoder(bytes)
        return this.fromABI(decoder)
    }

    data: Bytes

    constructor(data: Bytes) {
        if (data.array.length !== 16) {
            throw new Error('Invalid float128')
        }
        this.data = data
    }

    equals(other: Float128Type) {
        const self = this.constructor as typeof Float128
        return this.data.equals(self.from(other).data)
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeArray(this.data.array)
    }

    toString() {
        // float128 uses 0x prefixed hex strings as opposed to everywhere else in where there is no prefix ¯\_(ツ)_/¯
        return '0x' + this.data.hexString
    }

    /** Spelling a `get_table_rows` bound needs: nodeos reads it as a big-endian integer. */
    toBoundHex() {
        return '0x' + new Bytes(this.data.array.slice().reverse()).hexString
    }

    toJSON() {
        return this.toString()
    }
}
