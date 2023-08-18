import {ABISerializableObject} from '../serializer/serializable'
import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {isInstanceOf, secureRandom} from '../utils'

import {Bytes, BytesType} from '../'

type FloatType = Float | number | string

class Float implements ABISerializableObject {
    static abiName = '__float'
    static byteWidth: number

    static from<T extends typeof Float>(this: T, value: FloatType): InstanceType<T>
    static from(value: FloatType): unknown
    static from(value: FloatType) {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (typeof value === 'string') {
            value = Number.parseFloat(value)
        } else if (isInstanceOf(value, Float)) {
            value = value.value
        }
        return new this(value)
    }

    static fromABI<T extends typeof Float>(this: T, decoder: ABIDecoder): InstanceType<T>
    static fromABI(decoder: ABIDecoder): unknown
    static fromABI(decoder: ABIDecoder) {
        return new this(decoder.readFloat(this.byteWidth))
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

    constructor(value: number) {
        this.value = value
    }

    equals(other: FloatType) {
        const self = this.constructor as typeof Float
        return this.value === self.from(other).value
    }

    toABI(encoder: ABIEncoder) {
        const self = this.constructor as typeof Float
        encoder.writeFloat(this.value, self.byteWidth)
    }

    toString() {
        return this.value.toString()
    }

    toJSON() {
        return this.toString()
    }
}

export type Float32Type = Float32 | FloatType
export class Float32 extends Float {
    static abiName = 'float32'
    static byteWidth = 4

    toString() {
        return this.value.toFixed(7)
    }
}

export type Float64Type = Float64 | FloatType
export class Float64 extends Float {
    static abiName = 'float64'
    static byteWidth = 8
}

export type Float128Type = Float128 | BytesType
export class Float128 implements ABISerializableObject {
    static abiName = 'float128'
    static byteWidth = 16

    static from(value: Float128Type) {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (typeof value === 'string' && value.startsWith('0x')) {
            value = value.slice(2)
        }
        return new this(Bytes.from(value))
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(new Bytes(decoder.readArray(this.byteWidth)))
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

    toJSON() {
        return this.toString()
    }
}
