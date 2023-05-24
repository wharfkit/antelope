import {ABISerializableObject} from '../serializer/serializable'
import {ABIEncoder} from '../serializer/encoder'
import {ABIDecoder} from '../serializer/decoder'
import {isInstanceOf} from '../utils'

import {UInt64} from '../'

/** Type representing a name. */
export type NameType = Name | UInt64 | string

/** Antelope/EOSIO Name */
export class Name implements ABISerializableObject {
    static abiName = 'name'

    /** Regex pattern matching a Antelope/EOSIO name, case-sensitive. */
    static pattern = /^[a-z1-5.]{0,13}$/

    /** The numeric representation of the name. */
    value: UInt64

    /**
     * The raw representation of the name.
     * @deprecated Use value instead.
     */
    get rawValue(): UInt64 {
        return this.value
    }

    /** Create a new Name instance from any of its representing types. */
    static from(value: NameType): Name {
        if (isInstanceOf(value, Name)) {
            return value
        } else if (typeof value === 'string') {
            return new Name(stringToName(value))
        } else if (isInstanceOf(value, UInt64)) {
            return new Name(value)
        } else {
            throw new Error('Invalid name')
        }
    }

    static fromABI(decoder: ABIDecoder) {
        return new Name(UInt64.fromABI(decoder))
    }

    static abiDefault() {
        return new this(UInt64.from(0))
    }

    constructor(value: UInt64) {
        this.value = value
    }

    /** Return true if this name is equal to passed name. */
    equals(other: NameType) {
        return this.value.equals(Name.from(other).value)
    }

    /** Return string representation of this name. */
    toString() {
        return nameToString(this.value)
    }

    toABI(encoder: ABIEncoder) {
        this.value.toABI(encoder)
    }

    /** @internal */
    toJSON() {
        return this.toString()
    }
}

function stringToName(s: string): UInt64 {
    function charToSymbol(c: number) {
        if (c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) {
            return c - 'a'.charCodeAt(0) + 6
        }
        if (c >= '1'.charCodeAt(0) && c <= '5'.charCodeAt(0)) {
            return c - '1'.charCodeAt(0) + 1
        }
        return 0
    }
    const a = new Uint8Array(8)
    let bit = 63
    for (let i = 0; i < s.length; ++i) {
        let c = charToSymbol(s.charCodeAt(i))
        if (bit < 5) {
            c = c << 1
        }
        for (let j = 4; j >= 0; --j) {
            if (bit >= 0) {
                a[Math.floor(bit / 8)] |= ((c >> j) & 1) << bit % 8
                --bit
            }
        }
    }
    return UInt64.from(a)
}

function nameToString(n: UInt64): string {
    const a = n.value.toArray('le', 8)
    let result = ''
    for (let bit = 63; bit >= 0; ) {
        let c = 0
        for (let i = 0; i < 5; ++i) {
            if (bit >= 0) {
                c = (c << 1) | ((a[Math.floor(bit / 8)] >> bit % 8) & 1)
                --bit
            }
        }
        if (c >= 6) {
            result += String.fromCharCode(c + 'a'.charCodeAt(0) - 6)
        } else if (c >= 1) {
            result += String.fromCharCode(c + '1'.charCodeAt(0) - 1)
        } else {
            result += '.'
        }
    }
    while (result.endsWith('.')) {
        result = result.substr(0, result.length - 1)
    }
    return result
}
