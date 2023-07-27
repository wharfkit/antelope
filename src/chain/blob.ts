import {ABISerializableObject} from '../serializer/serializable'
import {ABIEncoder} from '../serializer/encoder'
import {arrayEquals, isInstanceOf} from '../utils'

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
        // fix up base64 padding from nodeos
        switch (value.length % 4) {
            case 2:
                value += '=='
                break
            case 3:
                value += '='
                break
            case 1:
                value = value.substring(0, value.length - 1)
                break
        }
        const string = atob(value)
        const array = new Uint8Array(string.length)
        for (let i = 0; i < string.length; i++) {
            array[i] = string.charCodeAt(i)
        }
        return new this(array)
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

    get base64String(): string {
        return btoa(this.utf8String)
    }

    /** UTF-8 string representation of this instance. */
    get utf8String(): string {
        return new TextDecoder().decode(this.array)
    }

    toABI(encoder: ABIEncoder) {
        encoder.writeArray(this.array)
    }

    toString() {
        return this.base64String
    }

    toJSON() {
        return this.toString()
    }
}
