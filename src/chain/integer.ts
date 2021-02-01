import BN from 'bn.js'

import {ABISerializableObject} from '../serializer/serializable'
import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {isInstanceOf, secureRandom} from '../utils'

type IntType = Int | BNInt | number | string | BN

class Int implements ABISerializableObject {
    static abiName = '__int'
    static isSigned: boolean
    static byteWidth: number

    static get max(): number {
        return Math.pow(2, this.byteWidth * 8 - (this.isSigned ? 1 : 0)) - 1
    }

    static get min(): number {
        return this.isSigned ? -(this.max + 1) : 0
    }

    static from<T extends typeof Int>(this: T, value: IntType): InstanceType<T>
    static from(value: any): unknown
    static from(value: any): any {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (typeof value === 'string') {
            value = Number.parseInt(value, 10)
        } else if (isInstanceOf(value, BNInt)) {
            value = value.value.toNumber()
        } else if (isInstanceOf(value, Int)) {
            value = value.value
        } else if (BN.isBN(value)) {
            value = value.toNumber()
        }
        if (typeof value !== 'number') {
            throw new Error('Invalid integer')
        }
        return new this(value)
    }

    static fromABI<T extends typeof Int>(this: T, decoder: ABIDecoder): InstanceType<T>
    static fromABI(decoder: ABIDecoder): unknown
    static fromABI(decoder: ABIDecoder) {
        return new this(decoder.readNum(this.byteWidth, this.isSigned))
    }

    static random<T extends typeof Int>(this: T): InstanceType<T>
    static random(): unknown
    static random() {
        const bytes = secureRandom(this.byteWidth)
        const decoder = new ABIDecoder(bytes)
        return this.fromABI(decoder)
    }

    value: number

    constructor(value: number) {
        if (!Number.isFinite(value)) {
            throw new Error('Invalid number')
        }
        this.value = clamp(value, this.constructor['min'], this.constructor['max'])
    }

    equals(other: IntType) {
        const self = this.constructor as typeof Int
        return this.value === self.from(other).value
    }

    toABI(encoder: ABIEncoder) {
        const self = this.constructor as typeof Int
        encoder.writeNum(this.value, self.byteWidth, self.isSigned)
    }

    toNumber() {
        return this.value
    }

    toString() {
        return this.value.toFixed(0)
    }

    toJSON() {
        return this.value
    }
}

class BNInt implements ABISerializableObject {
    static abiName = '__bn_int'
    static isSigned: boolean
    static byteWidth: number

    static from<T extends typeof BNInt>(this: T, value: IntType | Uint8Array): InstanceType<T>
    static from(value: any): unknown
    static from(value: any): any {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (isInstanceOf(value, BNInt)) {
            return new this(value.value)
        }
        if (isInstanceOf(value, Uint8Array)) {
            return new this(new BN(value, undefined, 'le'))
        }
        if (isInstanceOf(value, Int)) {
            value = value.value
        }
        return new this(new BN(value))
    }

    static fromABI<T extends typeof BNInt>(this: T, decoder: ABIDecoder): InstanceType<T>
    static fromABI(decoder: ABIDecoder): unknown
    static fromABI(decoder: ABIDecoder) {
        return new this(decoder.readBn(this.byteWidth, this.isSigned))
    }

    static random<T extends typeof BNInt>(this: T): InstanceType<T>
    static random(): unknown
    static random() {
        const bytes = secureRandom(this.byteWidth)
        const decoder = new ABIDecoder(bytes)
        return this.fromABI(decoder)
    }

    value: BN

    constructor(value: BN) {
        const self = this.constructor as typeof BNInt
        if (value.byteLength() > self.byteWidth) {
            throw new Error('Number too wide')
        }
        this.value = value
    }

    equals(other: IntType | Uint8Array, allowCast = false) {
        const self = this.constructor as typeof BNInt
        if (
            !allowCast &&
            typeof (other.constructor as any).byteWidth === 'number' &&
            (other.constructor as any).byteWidth !== self.byteWidth
        ) {
            return false
        }
        return this.value.eq(self.from(other).value)
    }

    toABI(encoder: ABIEncoder) {
        const self = this.constructor as typeof BNInt
        encoder.writeBn(this.value, self.byteWidth, self.isSigned)
    }

    /**
     * Return JavaScript number for this instance.
     * @throws If the number is larger than 53-bits.
     **/
    toNumber() {
        return this.value.toNumber()
    }

    toString() {
        return this.value.toString()
    }

    toJSON() {
        // match FCs behavior and return strings for anything above Uint32
        if (this.value.bitLength() > 32) {
            return this.value.toString()
        } else {
            return this.value.toNumber()
        }
    }
}

export type Int8Type = Int8 | IntType
export class Int8 extends Int {
    static abiName = 'int8'
    static byteWidth = 1
    static isSigned = true
}

export type Int16Type = Int16 | IntType
export class Int16 extends Int {
    static abiName = 'int16'
    static byteWidth = 2
    static isSigned = true
}

export type Int32Type = Int32 | IntType
export class Int32 extends Int {
    static abiName = 'int32'
    static byteWidth = 4
    static isSigned = true
}

export type Int64Type = Int64 | IntType
export class Int64 extends BNInt {
    static abiName = 'int64'
    static byteWidth = 8
    static isSigned = true
}

export type Int128Type = Int128 | IntType
export class Int128 extends BNInt {
    static abiName = 'int128'
    static byteWidth = 16
    static isSigned = true
}

export type UInt8Type = UInt8 | IntType
export class UInt8 extends Int {
    static abiName = 'uint8'
    static byteWidth = 1
    static isSigned = false
}

export type UInt16Type = UInt16 | IntType
export class UInt16 extends Int {
    static abiName = 'uint16'
    static byteWidth = 2
    static isSigned = false
}

export type UInt32Type = UInt32 | IntType
export class UInt32 extends Int {
    static abiName = 'uint32'
    static byteWidth = 4
    static isSigned = false
}

export type UInt64Type = UInt64 | IntType
export class UInt64 extends BNInt {
    static abiName = 'uint64'
    static byteWidth = 8
    static isSigned = false
}

export type UInt128Type = UInt128 | IntType
export class UInt128 extends BNInt {
    static abiName = 'uint128'
    static byteWidth = 16
    static isSigned = false
}

export type VarIntType = VarInt | IntType
export class VarInt extends Int {
    static abiName = 'varint32'
    static byteWidth = 32
    static isSigned = true

    static fromABI(decoder: ABIDecoder) {
        return new this(decoder.readVarint32())
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeVarint32(this.value)
    }
}
export type VarUIntType = VarUInt | IntType
export class VarUInt extends Int {
    static abiName = 'varuint32'
    static byteWidth = 32
    static isSigned = false

    static fromABI(decoder: ABIDecoder) {
        return new this(decoder.readVaruint32())
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeVaruint32(this.value)
    }
}

export type AnyInt =
    | Int8Type
    | Int16Type
    | Int32Type
    | Int64Type
    | Int128Type
    | UInt8Type
    | UInt16Type
    | UInt32Type
    | UInt64Type
    | UInt128Type
    | VarIntType
    | VarUIntType

function clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
}
