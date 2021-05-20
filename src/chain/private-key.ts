import {Base58} from '../base58'
import {isInstanceOf} from '../utils'

import {getPublic} from '../crypto/get-public'
import {sharedSecret} from '../crypto/shared-secret'
import {sign} from '../crypto/sign'
import {generate} from '../crypto/generate'

import {
    Bytes,
    BytesType,
    Checksum256,
    Checksum256Type,
    Checksum512,
    CurveType,
    PublicKey,
    Signature,
} from '../'

export type PrivateKeyType = PrivateKey | string

export class PrivateKey {
    type: CurveType
    data: Bytes

    /** Create PrivateKey object from representing types. */
    static from(value: PrivateKeyType) {
        if (isInstanceOf(value, PrivateKey)) {
            return value
        } else {
            return this.fromString(value)
        }
    }

    /**
     * Create PrivateKey object from a string representation.
     * Accepts WIF (5...) and EOSIO (PVT_...) style private keys.
     */
    static fromString(string: string, ignoreChecksumError = false) {
        try {
            const {type, data} = decodeKey(string)
            return new this(type, data)
        } catch (error) {
            error.message = `Invalid private key (${error.message})`
            if (
                ignoreChecksumError &&
                isInstanceOf(error, Base58.DecodingError) &&
                error.code === Base58.ErrorCode.E_CHECKSUM
            ) {
                const type = string.startsWith('PVT_R1') ? CurveType.R1 : CurveType.K1
                let data = new Bytes(error.info.data)
                if (data.array.length == 33) {
                    data = data.droppingFirst()
                }
                return new this(type, data)
            }
            throw error
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
        return this.signDigest(Checksum256.hash(message))
    }

    /**
     * Derive the shared secret between this private key and given public key.
     * @throws If the key type isn't R1 or K1.
     */
    sharedSecret(publicKey: PublicKey) {
        const shared = sharedSecret(this.data.array, publicKey.data.array, this.type)
        return Checksum512.hash(shared)
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

/** @internal */
function decodeKey(value: string) {
    const type = typeof value
    if (type !== 'string') {
        throw new Error(`Expected string, got ${type}`)
    }
    if (value.startsWith('PVT_')) {
        // EOSIO format
        const parts = value.split('_')
        if (parts.length !== 3) {
            throw new Error('Invalid PVT format')
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
        return {type, data}
    } else {
        // WIF format
        const type = CurveType.K1
        const data = Base58.decodeCheck(value)
        if (data.array[0] !== 0x80) {
            throw new Error('Invalid WIF')
        }
        return {type, data: data.droppingFirst()}
    }
}
