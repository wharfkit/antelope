import {ABISerializableObject} from '../serializer/serializable'
import {ABIEncoder} from '../serializer/encoder'
import {arrayEquals, arrayToHex, isInstanceOf} from '../utils'

export type BlobType = Blob | string

export class Blob implements ABISerializableObject {
    static abiName = 'blob'

    /**
     * Create a new Bytes instance.
     * @note Make sure to take a [[copy]] before mutating the bytes as the underlying source is not copied here.
     */
    static from(value: BlobType): Blob {
        if (isInstanceOf(value, this)) {
            return value
        }
        if (typeof value === 'string') {
            return this.fromString(value)
        }
        throw new Error('Invalid blob')
    }

    static fromString(value: string) {
        return new this(Buffer.from(value, 'base64'))
    }

    readonly array: Uint8Array

    constructor(array: Uint8Array) {
        this.array = array
    }

    equals(other: BlobType): boolean {
        const self = this.constructor as typeof Blob
        try {
            return arrayEquals(this.array, self.from(other).array)
        } catch {
            return false
        }
    }

    get hexString(): string {
        return Buffer.from(this.array).toString('base64')
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeArray(this.array)
    }

    toString() {
        return this.hexString
    }

    toJSON() {
        return this.toString()
    }
}
