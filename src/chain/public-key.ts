import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {ABISerializable} from '../serializer/serializable'

import {Base58} from '../base58'
import {Bytes} from './bytes'

export type PublicKeyType = PublicKey | string | {type: string; compressed: Uint8Array}

export class PublicKey implements ABISerializable {
    static abiName = 'public_key'

    /** Type, e.g. `K1` */
    type: string
    /** Compressed public key point. */
    data: Bytes

    /** Create PublicKey object from representing types. */
    static from(value: PublicKeyType) {
        if (value instanceof PublicKey) {
            return value
        }
        if (typeof value === 'object') {
            return new PublicKey(value.type, new Bytes(value.compressed))
        }
        if (value.startsWith('PUB_')) {
            const parts = value.split('_')
            if (parts.length !== 3) {
                throw new Error('Invalid signature string')
            }
            const type = parts[1]
            const size = type === 'K1' || type === 'R1' ? 33 : undefined
            const data = Base58.decodeRipemd160Check(parts[2], size, type)
            return new PublicKey(type, data)
        } else if (value.length >= 50) {
            // Legacy EOS key
            const data = Base58.decodeRipemd160Check(value.slice(-50))
            return new PublicKey('K1', data)
        } else {
            throw new Error('Invalid signature string')
        }
    }

    /** @internal */
    static fromABI(decoder: ABIDecoder) {
        const typeIdx = decoder.readUint8()
        let type: string
        switch (typeIdx) {
            case 0:
                type = 'K1'
                break
            case 1:
                type = 'R1'
                break
            case 2: {
                // "WA" keys pack some sort of metadata
                // we probably need to restructure key data storage into containers like FC does
                const data = new Bytes(decoder.readArray(33))
                Bytes.fromABI(decoder)
                return new PublicKey('WA', data)
            }
            default:
                throw new Error(`Unknown public key type: ${typeIdx}`)
        }
        return new PublicKey(type, new Bytes(decoder.readArray(33)))
    }

    /** @internal */
    constructor(type: string, data: Bytes) {
        this.type = type
        this.data = data
    }

    /**
     * Return EOSIO legacy (`EOS<base58data>`) formatted key.
     * @throws If the key type isn't `K1`
     */
    toLegacyString(prefix = 'EOS') {
        if (this.type !== 'K1') {
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
        switch (this.type) {
            case 'K1':
                encoder.writeUint8(0)
                break
            case 'R1':
                encoder.writeUint8(1)
                break
            case 'WA':
                encoder.writeUint8(2)
                // TODO: this isn't actually supported yet since we threw away the metadata when decoding
                throw new Error('WA keys are not supported yet')
            default:
                throw new Error(`Unable to encode unknown key type: ${this.type}`)
        }
        encoder.writeBytes(this.data.array)
    }

    /** @internal */
    toJSON() {
        return this.toString()
    }
}
