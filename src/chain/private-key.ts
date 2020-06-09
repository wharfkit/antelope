import {Base58} from '../base58'

import {Bytes, BytesType} from './bytes'
import {Checksum256, ChecksumType} from './checksum'
import {PublicKey} from './public-key'
import {Signature} from './signature'

import {getPublic} from '../crypto/get-public'
import {sharedSecret} from '../crypto/shared-secret'
import {sign} from '../crypto/sign'
import {generate} from '../crypto/generate'

export type PrivateKeyType = PrivateKey | string

export class PrivateKey {
    type: string
    data: Bytes

    /** Create PrivateKey object from representing types. */
    static from(value: PrivateKeyType) {
        if (value instanceof PrivateKey) {
            return value
        }
        if (value.startsWith('PVT_')) {
            // EOSIO format
            const parts = value.split('_')
            if (parts.length !== 3) {
                throw new Error('Invalid private key string')
            }
            const type = parts[1]
            let size: number | undefined
            switch (type) {
                case 'K1':
                    size = 33
                    break
                case 'R1':
                    size = 32
                    break
            }
            const data = Base58.decodeRipemd160Check(parts[2], size, type)
            return new PrivateKey(type, type === 'K1' ? data.droppingFirst() : data)
        } else {
            // WIF format
            const type = 'K1'
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
    static generate(type: string) {
        return new PrivateKey(type, new Bytes(generate(type)))
    }

    /** @internal */
    constructor(type: string, data: Bytes) {
        this.type = type
        this.data = data
    }

    /**
     * Sign message digest using this key.
     * @throws If the key type isn't R1 or K1.
     */
    signDigest(digest: ChecksumType) {
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
        if (this.type !== 'K1') {
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
}
