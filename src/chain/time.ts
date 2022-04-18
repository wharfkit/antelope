import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {ABISerializableObject} from '../serializer/serializable'
import {isInstanceOf} from '../utils'

import {AnyInt, Int64, Int64Type, UInt32, UInt32Type, UInt64} from '../'

export type TimePointType = TimePoint | TimePointSec | string | Date | AnyInt

interface TimePointConstructor {
    from(value: TimePointType): TimePointBase
    fromInteger(value: AnyInt): TimePointBase
    fromDate(value: Date): TimePointBase
    fromString(value: string): TimePointBase
    fromMilliseconds(value: number): TimePointBase
    new (...args: any[]): TimePointBase
}

class TimePointBase implements ABISerializableObject {
    static abiName = '__time_point_base'

    static from<T extends TimePointConstructor>(this: T, value: TimePointType): InstanceType<T>
    static from(value: TimePointType): unknown
    static from(this: TimePointConstructor, value: TimePointType) {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (isInstanceOf(value, TimePointBase)) {
            // converting between types
            return this.fromMilliseconds(value.toMilliseconds())
        }
        if (isInstanceOf(value, Date)) {
            return this.fromDate(value)
        }
        if (typeof value === 'string') {
            return this.fromString(value)
        }

        return this.fromInteger(value)
    }

    static fromString<T extends TimePointConstructor>(this: T, string: string): InstanceType<T>
    static fromString(string: string): unknown
    static fromString(this: TimePointConstructor, string: string) {
        const value = Date.parse(string + 'Z')
        if (!Number.isFinite(value)) {
            throw new Error('Invalid date string')
        }
        return this.fromMilliseconds(value)
    }

    static fromDate<T extends TimePointConstructor>(this: T, date: Date): InstanceType<T>
    static fromDate(date: Date): unknown
    static fromDate(this: TimePointConstructor, date: Date) {
        return this.fromMilliseconds(date.getTime())
    }

    static abiDefault<T extends TimePointConstructor>(this: T): InstanceType<T>
    static abiDefault(): unknown {
        return this.from(0)
    }

    toABI(encoder: ABIEncoder) {
        const self = this as any
        self.value.toABI(encoder)
    }

    equals(other: TimePointType) {
        const self = this.constructor as TimePointConstructor
        return this.toMilliseconds() === self.from(other).toMilliseconds()
    }

    toMilliseconds(): number {
        throw new Error('Not implemented')
    }

    toDate() {
        return new Date(this.toMilliseconds())
    }

    toJSON() {
        return this.toString()
    }
}

/** Timestamp with microsecond accuracy. */
export class TimePoint extends TimePointBase {
    static abiName = 'time_point'

    static fromMilliseconds(ms: number) {
        return new this(Int64.from(Math.round(ms * 1000)))
    }

    static fromInteger(value: Int64Type) {
        return new this(Int64.from(value))
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(Int64.fromABI(decoder))
    }

    value: Int64
    constructor(value: Int64) {
        super()
        this.value = value
    }

    toString() {
        return this.toDate().toISOString().slice(0, -1)
    }

    toMilliseconds() {
        return Number(this.value.dividing(1000, 'round'))
    }
}

/** Timestamp with second accuracy. */
export class TimePointSec extends TimePointBase {
    static abiName = 'time_point_sec'

    static fromMilliseconds(ms: number) {
        return new this(UInt32.from(Math.round(ms / 1000)))
    }

    static fromInteger(value: UInt32Type) {
        return new this(UInt32.from(value))
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(UInt32.fromABI(decoder))
    }

    value: UInt32
    constructor(value: UInt32) {
        super()
        this.value = value
    }

    toString() {
        return this.toDate().toISOString().slice(0, -5)
    }

    toMilliseconds() {
        return Number(this.value.cast(UInt64).multiplying(1000))
    }
}

export class BlockTimestamp extends TimePointBase {
    static abiName = 'block_timestamp_type'

    static fromMilliseconds(ms: number) {
        return new this(UInt32.from(Math.round((ms - 946684800000) / 500)))
    }

    static fromInteger(value: UInt32Type) {
        return new this(UInt32.from(value))
    }

    static fromABI(decoder: ABIDecoder) {
        return new this(UInt32.fromABI(decoder))
    }

    value: UInt32
    constructor(value: UInt32) {
        super()
        this.value = value
    }

    toString() {
        return this.toDate().toISOString().slice(0, -1)
    }

    toMilliseconds() {
        return Number(this.value.cast(UInt64).multiplying(500).adding(946684800000))
    }
}
