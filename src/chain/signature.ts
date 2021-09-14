import {ABIDecoder} from '../serializer/decoder'
import {ABIEncoder} from '../serializer/encoder'
import {ABISerializableObject} from '../serializer/serializable'

import {Base58} from '../base58'
import {isInstanceOf} from '../utils'

import {recover} from '../crypto/recover'
import {verify} from '../crypto/verify'

import {Bytes, BytesType, Checksum256, Checksum256Type, KeyType, PublicKey} from '../'

export type SignatureType =
    | Signature
    | string
    | {type: string; r: Uint8Array; s: Uint8Array; recid: number}

export class Signature implements ABISerializableObject {
    static abiName = 'signature'

    /** Type, e.g. `K1` */
    type: KeyType
    /** Signature data. */
    data: Bytes

    /** Create Signature object from representing types. */
    static from(value: SignatureType) {
        if (isInstanceOf(value, Signature)) {
            return value
        }
        if (typeof value === 'object' && value.r && value.s) {
            const data = new Uint8Array(1 + 32 + 32)
            let recid = value.recid
            const type = KeyType.from(value.type)
            if (value.type === KeyType.K1 || value.type === KeyType.R1) {
                recid += 31
            }
            data[0] = recid
            data.set(value.r, 1)
            data.set(value.s, 33)
            return new Signature(type, new Bytes(data))
        }
        if (typeof value !== 'string') {
            throw new Error('Invalid signature')
        }
        if (value.startsWith('SIG_')) {
            const parts = value.split('_')
            if (parts.length !== 3) {
                throw new Error('Invalid signature string')
            }
            const type = KeyType.from(parts[1])
            const size = type === KeyType.K1 || type === KeyType.R1 ? 65 : undefined
            const data = Base58.decodeRipemd160Check(parts[2], size, type)
            return new Signature(type, data)
        } else {
            throw new Error('Invalid signature string')
        }
    }

    /** @internal */
    static fromABI(decoder: ABIDecoder) {
        const type = KeyType.from(decoder.readByte())
        if (type === KeyType.WA) {
            const startPos = decoder.getPosition()
            decoder.advance(65) // compact_signature
            decoder.advance(decoder.readVaruint32()) // auth_data
            decoder.advance(decoder.readVaruint32()) // client_json
            const len = decoder.getPosition() - startPos
            decoder.setPosition(startPos)
            const data = Bytes.from(decoder.readArray(len))
            return new Signature(KeyType.WA, data)
        }
        return new Signature(type, new Bytes(decoder.readArray(65)))
    }

    /** @internal */
    constructor(type: KeyType, data: Bytes) {
        this.type = type
        this.data = data
    }

    equals(other: SignatureType) {
        const otherSig = Signature.from(other)
        return this.type === otherSig.type && this.data.equals(otherSig.data)
    }

    /** Recover public key from given message digest. */
    recoverDigest(digest: Checksum256Type) {
        digest = Checksum256.from(digest)
        const compressed = recover(this.data.array, digest.array, this.type)
        return PublicKey.from({compressed, type: this.type})
    }

    /** Recover public key from given message. */
    recoverMessage(message: BytesType) {
        return this.recoverDigest(Checksum256.hash(message))
    }

    /** Verify this signature with given message digest and public key. */
    verifyDigest(digest: Checksum256Type, publicKey: PublicKey) {
        digest = Checksum256.from(digest)
        return verify(this.data.array, digest.array, publicKey.data.array, this.type)
    }

    /** Verify this signature with given message and public key. */
    verifyMessage(message: BytesType, publicKey: PublicKey) {
        return this.verifyDigest(Checksum256.hash(message), publicKey)
    }

    /** Base58check encoded string representation of this signature (`SIG_<type>_<data>`). */
    toString() {
        return `SIG_${this.type}_${Base58.encodeRipemd160Check(this.data, this.type)}`
    }

    /** @internal */
    toABI(encoder: ABIEncoder) {
        encoder.writeByte(KeyType.indexFor(this.type))
        encoder.writeArray(this.data.array)
    }

    /** @internal */
    toJSON() {
        return this.toString()
    }
}
