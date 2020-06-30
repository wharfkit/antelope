import BN from 'bn.js'

import {ABISerializableObject} from '../serializer/serializable'
import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'

export type IntType = Int | BNInt | number | string | BN

export class Int implements ABISerializableObject {
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

    toJSON() {
        return this.value
    }
}

type BNIntType = IntType | Uint8Array

class BNInt implements ABISerializableObject {
    static isSigned: boolean
    static byteWidth: number

    static from<T extends typeof BNInt>(this: T, value: BNIntType): InstanceType<T> {
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

    value: BN

    constructor(value: BN) {
        const self = this.constructor as typeof BNInt
        if (value.byteLength() > self.byteWidth) {
            throw new Error('Number too wide')
        }
        this.value = value
    }

    equals(other: BNIntType, allowCast = false) {
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
        if (this.value.gt(new BN(0xffffffff))) {
            return this.value.toString()
        } else {
            return this.value.toNumber()
        }
    }
}

export class Int8 extends Int {
    static abiName = 'int8'
    static byteWidth = 1
    static isSigned = true
}

export class Int16 extends Int {
    static abiName = 'int16'
    static byteWidth = 2
    static isSigned = true
}

export class Int32 extends Int {
    static abiName = 'int32'
    static byteWidth = 4
    static isSigned = true
}

export class Int64 extends BNInt {
    static abiName = 'int64'
    static byteWidth = 8
    static isSigned = true
}

export class Int128 extends BNInt {
    static abiName = 'int128'
    static byteWidth = 16
    static isSigned = true
}

export class Int256 extends BNInt {
    static abiName = 'int256'
    static byteWidth = 32
    static isSigned = true
}

export class UInt8 extends Int {
    static abiName = 'uint8'
    static byteWidth = 1
    static isSigned = false
}

export class UInt16 extends Int {
    static abiName = 'uint16'
    static byteWidth = 2
    static isSigned = false
}

export class UInt32 extends Int {
    static abiName = 'uint32'
    static byteWidth = 4
    static isSigned = false
}

export class UInt64 extends BNInt {
    static abiName = 'uint64'
    static byteWidth = 8
    static isSigned = false
}

export class UInt128 extends BNInt {
    static abiName = 'uint128'
    static byteWidth = 16
    static isSigned = false
}

export class UInt256 extends BNInt {
    static abiName = 'uint256'
    static byteWidth = 32
    static isSigned = false
}

export class VarInt extends Int {
    static abiName = 'varint32'
    static byteWidth = 32
    static isSigned = true

    static fromABI<T extends typeof Int>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(decoder.readVarint32()) as InstanceType<T>
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeVarint32(this.value)
    }
}

export class VarUInt extends Int {
    static abiName = 'varuint32'
    static byteWidth = 32
    static isSigned = false

    static fromABI<T extends typeof Int>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(decoder.readVaruint32()) as InstanceType<T>
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeVaruint32(this.value)
    }
}

function clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
}
