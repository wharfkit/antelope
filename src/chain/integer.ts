import BN from 'bn.js'

import {ABISerializable} from '../serializer/serializable'
import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'

export type IntType = Int | number | string | BN

class Int implements ABISerializable {
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
        }
        if (BN.isBN(value)) {
            value = value.toNumber()
        }
        return new this(value) as InstanceType<T>
    }

    static fromABI<T extends typeof Int>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(
            decoder[`read${this.isSigned ? 'Int' : 'Uint'}${this.byteWidth * 8}`]()
        ) as InstanceType<T>
    }

    value: number

    constructor(value: number) {
        if (!Number.isFinite(value)) {
            throw new Error('Invalid number')
        }
        this.value = clamp(value, this.constructor['min'], this.constructor['max'])
    }

    toABI(encoder: ABIEncoder) {
        let type = this.constructor['isSigned'] ? 'Uint' : 'Int'
        type += this.constructor['byteWidth'] * 8
        encoder['write' + type](this.value)
    }

    toJSON() {
        return this.value
    }
}

class BNInt implements ABISerializable {
    static isSigned: boolean
    static byteWidth: number

    static from<T extends typeof BNInt>(this: T, value: IntType | Uint8Array): InstanceType<T> {
        if (value instanceof this) {
            return value as InstanceType<T>
        }
        if (value instanceof Uint8Array) {
            return new this(new BN(value, undefined, 'le')) as InstanceType<T>
        }
        return new this(new BN(value as any)) as InstanceType<T>
    }

    static fromABI<T extends typeof BNInt>(this: T, decoder: ABIDecoder): InstanceType<T> {
        return new this(
            decoder[`read${this.isSigned ? 'Int' : 'Uint'}${this.byteWidth * 8}`]()
        ) as InstanceType<T>
    }

    value: BN

    constructor(value: BN) {
        if (value.byteLength > this.constructor['byteWidth']) {
            throw new Error('Number too wide')
        }
        this.value = value
    }

    toABI(encoder: ABIEncoder) {
        let type = this.constructor['isSigned'] ? 'Uint' : 'Int'
        type += this.constructor['byteWidth'] * 8
        encoder['write' + type](this.value)
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

function clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max)
}
