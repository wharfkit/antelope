import BN from 'bn.js'

import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {ABISerializable} from '../serializer/serializable'

import {Int64, IntType, UInt32} from './integer'

export type TimePointType = TimePointBase | string | Date | IntType

export class TimePointBase implements ABISerializable {
    static from<T extends typeof TimePointBase>(this: T, value: TimePointType): InstanceType<T> {
        if (value instanceof this) {
            return value as InstanceType<T>
        }
        if (value instanceof Date) {
            return this.fromDate(value) as InstanceType<T>
        }
        if (typeof value === 'string') {
            return this.fromString(value) as InstanceType<T>
        }
        return (this as any).fromInteger(value) as InstanceType<T>
    }

    static fromString<T extends typeof TimePointBase>(this: T, string: string): InstanceType<T> {
        const value = Date.parse(string + 'Z')
        if (!Number.isFinite(value)) {
            throw new Error('Invalid date string')
        }
        return (this as any).fromMilliseconds(value)
    }

    static fromDate<T extends typeof TimePointBase>(this: T, date: Date): InstanceType<T> {
        return (this as any).fromMilliseconds(date.getTime())
    }

    toABI(encoder: ABIEncoder) {
        const self = this as any
        self.value.toABI(encoder)
    }

    toDate() {
        return new Date((this as any).toMilliseconds())
    }

    toJSON() {
        return this.toString()
    }

    value: any
    constructor(value: any) {
        this.value = value
    }
}

/** Timestamp with microsecond accuracy. */
export class TimePoint extends TimePointBase {
    static abiName = 'time_point'

    static fromMilliseconds(ms: number) {
        return new TimePoint(Int64.from(Math.round(ms * 1000)))
    }

    static fromInteger(value: IntType) {
        return new TimePoint(Int64.from(value))
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(Int64.fromABI(decoder))
    }

    value!: Int64

    toString() {
        return this.toDate().toISOString().slice(0, -1)
    }

    toMilliseconds() {
        return this.value.value.divRound(new BN(1000)).toNumber()
    }
}

/** Timestamp with second accuracy. */
export class TimePointSec extends TimePointBase {
    static abiName = 'time_point_sec'

    static fromMilliseconds(ms: number) {
        return new TimePointSec(UInt32.from(Math.round(ms / 1000)))
    }

    static fromInteger(value: IntType) {
        return new TimePointSec(UInt32.from(value))
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(UInt32.fromABI(decoder))
    }

    value!: UInt32

    toString() {
        return this.toDate().toISOString().slice(0, -5)
    }

    toMilliseconds() {
        return this.value.value * 1000
    }
}
