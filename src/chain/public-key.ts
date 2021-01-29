import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {ABISerializableObject} from '../serializer/serializable'

import {Base58} from '../base58'
import {isInstanceOf} from '../utils'

import {Bytes, CurveType} from '../'

export type PublicKeyType = PublicKey | string | {type: string; compressed: Uint8Array}

export class PublicKey implements ABISerializableObject {
    static abiName = 'public_key'

    /** Type, e.g. `K1` */
    type: CurveType
    /** Compressed public key point. */
    data: Bytes

    /** Create PublicKey object from representing types. */
    static from(value: PublicKeyType) {
        if (isInstanceOf(value, PublicKey)) {
            return value
        }
        if (typeof value === 'object' && value.type && value.compressed) {
            return new PublicKey(CurveType.from(value.type), new Bytes(value.compressed))
        }
        if (typeof value !== 'string') {
            throw new Error('Invalid public key')
        }
        if (value.startsWith('PUB_')) {
            const parts = value.split('_')
            if (parts.length !== 3) {
                throw new Error('Invalid public key string')
            }
            const type = CurveType.from(parts[1])
            const size = type === CurveType.K1 || type === CurveType.R1 ? 33 : undefined
            const data = Base58.decodeRipemd160Check(parts[2], size, type)
            return new PublicKey(type, data)
        } else if (value.length >= 50) {
            // Legacy EOS key
            const data = Base58.decodeRipemd160Check(value.slice(-50))
            return new PublicKey(CurveType.K1, data)
        } else {
            throw new Error('Invalid public key string')
        }
    }

    /** @internal */
    static fromABI(decoder: ABIDecoder) {
        const type = CurveType.from(decoder.readByte())
        if (type == CurveType.WA) {
            // "WA" keys pack some sort of metadata
            // we probably need to restructure key data storage into containers like FC does
            const data = new Bytes(decoder.readArray(33))
            Bytes.fromABI(decoder) // throw away metadata for now
            return new PublicKey(type, data)
        }
        return new PublicKey(type, new Bytes(decoder.readArray(33)))
    }

    /** @internal */
    constructor(type: CurveType, data: Bytes) {
        this.type = type
        this.data = data
    }

    equals(other: PublicKeyType) {
        const otherKey = PublicKey.from(other)
        return this.type === otherKey.type && this.data.equals(otherKey.data)
    }

    /**
     * Return EOSIO legacy (`EOS<base58data>`) formatted key.
     * @throws If the key type isn't `K1`
     */
    toLegacyString(prefix = 'EOS') {
        if (this.type !== CurveType.K1) {
            throw new Error('Unable to create legacy formatted string for non-K1 key')
        }
        return `${prefix}${Base58.encodeRipemd160Check(this.data)}`
    }

    /** Return key in modern EOSIO format (`PUB_<type>_<base58data>`) */
    toString() {
        return `PUB_${this.type}_${Base58.encodeRipemd160Check(this.data, this.type)}`
    }

    /** @internal */
    toABI(encoder: ABIEncoder) {
        if (this.type === CurveType.WA) {
            throw new Error('WA keys are not supported yet')
        }
        encoder.writeByte(CurveType.indexFor(this.type))
        encoder.writeArray(this.data.array)
    }

    /** @internal */
    toJSON() {
        return this.toString()
    }
}
