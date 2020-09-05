import {Base58} from '../base58'

import {Bytes, BytesType} from './bytes'
import {Checksum256, Checksum256Type} from './checksum'
import {PublicKey} from './public-key'
import {Signature} from './signature'

import {getPublic} from '../crypto/get-public'
import {sharedSecret} from '../crypto/shared-secret'
import {sign} from '../crypto/sign'
import {generate} from '../crypto/generate'
import {CurveType} from './curve-type'

export type PrivateKeyType = PrivateKey | string

export class PrivateKey {
    type: CurveType
    data: Bytes

    /** Create PrivateKey object from representing types. */
    static from(value: PrivateKeyType) {
        if (value instanceof PrivateKey) {
            return value
        }
        if (typeof value !== 'string') {
            throw new Error('Invalid private key')
        }
        if (value.startsWith('PVT_')) {
            // EOSIO format
            const parts = value.split('_')
            if (parts.length !== 3) {
                throw new Error('Invalid private key string')
            }
            const type = CurveType.from(parts[1])
            let size: number | undefined
            switch (type) {
                case CurveType.K1:
                case CurveType.R1:
                    size = 32
                    break
            }
            const data = Base58.decodeRipemd160Check(parts[2], size, type)
            return new PrivateKey(type, data)
        } else {
            // WIF format
            const type = CurveType.K1
            const data = Base58.decodeCheck(value)
            if (data.array[0] !== 0x80) {
                throw new Error('Invalid private key wif')
            }
            return new PrivateKey(type, data.droppingFirst())
        }
    }

    /**
     * Generate new PrivateKey.
     * @throws If a secure random source isn't available.
     */
    static generate(type: CurveType | string) {
        return new PrivateKey(CurveType.from(type), new Bytes(generate(type)))
    }

    /** @internal */
    constructor(type: CurveType, data: Bytes) {
        this.type = type
        this.data = data
    }

    /**
     * Sign message digest using this key.
     * @throws If the key type isn't R1 or K1.
     */
    signDigest(digest: Checksum256Type) {
        digest = Checksum256.from(digest)
        return Signature.from(sign(this.data.array, digest.array, this.type))
    }

    /**
     * Sign message using this key.
     * @throws If the key type isn't R1 or K1.
     */
    signMessage(message: BytesType) {
        return this.signDigest(Bytes.from(message).sha256Digest)
    }

    /**
     * Derive the shared secret between this private key and given public key.
     * @throws If the key type isn't R1 or K1.
     */
    sharedSecret(publicKey: PublicKey) {
        const shared = sharedSecret(this.data.array, publicKey.data.array, this.type)
        return new Bytes(shared).sha512Digest
    }

    /**
     * Get the corresponding public key.
     * @throws If the key type isn't R1 or K1.
     */
    toPublic() {
        const compressed = getPublic(this.data.array, this.type)
        return PublicKey.from({compressed, type: this.type})
    }

    /**
     * Return WIF representation of this private key
     * @throws If the key type isn't K1.
     */
    toWif() {
        if (this.type !== CurveType.K1) {
            throw new Error('Unable to generate WIF for non-k1 key')
        }
        return Base58.encodeCheck(Bytes.from([0x80]).appending(this.data))
    }

    /**
     * Return the key in EOSIO PVT_<type>_<base58check> format.
     */
    toString() {
        return `PVT_${this.type}_${Base58.encodeRipemd160Check(this.data, this.type)}`
    }

    toJSON() {
        return this.toString()
    }
}
