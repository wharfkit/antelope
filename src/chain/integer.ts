import BN from 'bn.js'

import {ABISerializableObject} from '../serializer/serializable'
import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {secureRandom} from '../utils'

type IntType = Int | BNInt | number | string | BN

class Int implements ABISerializableObject {
    static abiName: string
    static isSigned: boolean
    static byteWidth: number

    static get max(): number {
        return Math.pow(2, this.byteWidth * 8 - (this.isSigned ? 1 : 0)) - 1
    }

    static get min(): number {
        return this.isSigned ? -(this.max + 1) : 0
    }

    static from<T extends typeof Int>(this: T, value: IntType): InstanceType<T> {
        if (value instanceof this) {
            return value as InstanceType<T>
        }
        if (typeof value === 'string') {
            value = Number.parseInt(value, 10)
        } else if (value instanceof BNInt) {
            value = value.value.toNumber()
        } else if (value instanceof Int) {
            value = value.value
        } else if (BN.isBN(value)) {
            value = value.toNumber()
        }
        return new this(value) as InstanceType<T>
    }

    static fromABI<T extends typeof Int>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(decoder.readNum(this.byteWidth, this.isSigned)) as InstanceType<T>
    }

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

    toString() {
        return this.value.toFixed(0)
    }

    toJSON() {
        return this.value
    }
}

class BNInt implements ABISerializableObject {
    static abiName: string
    static isSigned: boolean
    static byteWidth: number

    static from<T extends typeof BNInt>(this: T, value: IntType | Uint8Array): InstanceType<T> {
        if (value instanceof this) {
            return value as InstanceType<T>
        }
        if (value instanceof BNInt) {
            return new this(value.value) as InstanceType<T>
        }
        if (value instanceof Uint8Array) {
            return new this(new BN(value, undefined, 'le')) as InstanceType<T>
        }
        if (value instanceof Int) {
            value = value.value
        }
        return new this(new BN(value)) as InstanceType<T>
    }

    static fromABI<T extends typeof BNInt>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(decoder.readBn(this.byteWidth, this.isSigned)) as InstanceType<T>
    }

    static random<T extends typeof BNInt>(this: T): InstanceType<T> {
        const bytes = secureRandom(this.byteWidth)
        const decoder = new ABIDecoder(bytes)
        return this.fromABI(decoder) as InstanceType<T>
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

    static from<T extends typeof Int8>(this: T, value: Int8Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type Int16Type = Int16 | IntType
export class Int16 extends Int {
    static abiName = 'int16'
    static byteWidth = 2
    static isSigned = true

    static from<T extends typeof Int16>(this: T, value: Int16Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type Int32Type = Int32 | IntType
export class Int32 extends Int {
    static abiName = 'int32'
    static byteWidth = 4
    static isSigned = true

    static from<T extends typeof Int32>(this: T, value: Int32Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type Int64Type = Int64 | IntType
export class Int64 extends BNInt {
    static abiName = 'int64'
    static byteWidth = 8
    static isSigned = true

    static from<T extends typeof Int64>(this: T, value: Int64Type | Uint8Array): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type Int128Type = Int128 | IntType
export class Int128 extends BNInt {
    static abiName = 'int128'
    static byteWidth = 16
    static isSigned = true

    static from<T extends typeof Int128>(this: T, value: Int128Type | Uint8Array): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type UInt8Type = UInt8 | IntType
export class UInt8 extends Int {
    static abiName = 'uint8'
    static byteWidth = 1
    static isSigned = false

    static from<T extends typeof UInt8>(this: T, value: UInt8Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type UInt16Type = UInt16 | IntType
export class UInt16 extends Int {
    static abiName = 'uint16'
    static byteWidth = 2
    static isSigned = false

    static from<T extends typeof UInt16>(this: T, value: UInt16Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type UInt32Type = UInt32 | IntType
export class UInt32 extends Int {
    static abiName = 'uint32'
    static byteWidth = 4
    static isSigned = false

    static from<T extends typeof UInt32>(this: T, value: UInt32Type): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type UInt64Type = UInt64 | IntType
export class UInt64 extends BNInt {
    static abiName = 'uint64'
    static byteWidth = 8
    static isSigned = false

    static from<T extends typeof UInt64>(this: T, value: UInt64Type | Uint8Array): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type UInt128Type = UInt128 | IntType
export class UInt128 extends BNInt {
    static abiName = 'uint128'
    static byteWidth = 16
    static isSigned = false

    static from<T extends typeof UInt128>(
        this: T,
        value: UInt128Type | Uint8Array
    ): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }
}

export type VarIntType = VarInt | IntType
export class VarInt extends Int {
    static abiName = 'varint32'
    static byteWidth = 32
    static isSigned = true

    static from<T extends typeof VarInt>(this: T, value: VarIntType): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }

    static fromABI<T extends typeof VarInt>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(decoder.readVarint32()) as InstanceType<T>
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

    static from<T extends typeof VarUInt>(this: T, value: VarUIntType): InstanceType<T> {
        return super.from(value) as InstanceType<T>
    }

    static fromABI<T extends typeof VarUInt>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(decoder.readVaruint32()) as InstanceType<T>
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
