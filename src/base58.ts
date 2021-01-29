import {ripemd160, sha256} from 'hash.js'
import {arrayEquals} from './utils'
import {Bytes, BytesType} from './chain'

export namespace Base58 {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    const charMap = new Int16Array(0xff).fill(-1)
    for (let i = 0; i < 58; ++i) {
        charMap[chars.charCodeAt(i)] = i
    }

    /** Decode a Base58 encoded string. */
    export function decode(s: string, size?: number): Bytes {
        if (size == null) {
            return decodeVar(s)
        }
        const result = new Uint8Array(size)
        for (let i = 0; i < s.length; ++i) {
            let carry = charMap[s.charCodeAt(i)]
            if (carry < 0) {
                throw new Error('Invalid Base58 value')
            }
            for (let j = 0; j < size; ++j) {
                const x = result[j] * 58 + carry
                result[j] = x
                carry = x >> 8
            }
            if (carry) {
                throw new Error('Base58 value is out of range')
            }
        }
        result.reverse()
        return new Bytes(result)
    }

    /** Decode a Base58Check encoded string. */
    export function decodeCheck(encoded: string, size?: number) {
        const decoded = decode(encoded, size != null ? size + 4 : size)
        const data = decoded.array.subarray(0, -4)
        const checksum = decoded.array.subarray(-4)
        if (!arrayEquals(checksum, dsha256Checksum(data))) {
            throw new Error('Checksum mismatch')
        }
        return new Bytes(data)
    }

    /** Decode a Base58Check encoded string that uses ripemd160 instead of double sha256 for the digest. */
    export function decodeRipemd160Check(encoded: string, size?: number, suffix?: string) {
        const decoded = decode(encoded, size != null ? size + 4 : size)
        const data = decoded.array.subarray(0, -4)
        const checksum = decoded.array.subarray(-4)
        if (!arrayEquals(checksum, ripemd160Checksum(data, suffix))) {
            throw new Error('Checksum mismatch')
        }
        return new Bytes(data)
    }

    /** Encode bytes to a Base58 string.  */
    export function encode(data: BytesType) {
        data = Bytes.from(data)
        const result = [] as number[]
        for (const byte of data.array) {
            let carry = byte
            for (let j = 0; j < result.length; ++j) {
                const x = (charMap[result[j]] << 8) + carry
                result[j] = chars.charCodeAt(x % 58)
                carry = (x / 58) | 0
            }
            while (carry) {
                result.push(chars.charCodeAt(carry % 58))
                carry = (carry / 58) | 0
            }
        }
        for (const byte of data.array) {
            if (byte) {
                break
            } else {
                result.push('1'.charCodeAt(0))
            }
        }
        result.reverse()
        return String.fromCharCode(...result)
    }

    export function encodeCheck(data: BytesType) {
        data = Bytes.from(data)
        data = data.appending(dsha256Checksum(data.array))
        return encode(data)
    }

    export function encodeRipemd160Check(data: BytesType, suffix?: string) {
        data = Bytes.from(data)
        data = data.appending(ripemd160Checksum(data.array, suffix))
        return encode(data)
    }

    /** @internal */
    function decodeVar(s: string) {
        const result: number[] = []
        for (let i = 0; i < s.length; ++i) {
            let carry = charMap[s.charCodeAt(i)]
            if (carry < 0) {
                throw new Error('Invalid Base58 value')
            }
            for (let j = 0; j < result.length; ++j) {
                const x = result[j] * 58 + carry
                result[j] = x & 0xff
                carry = x >> 8
            }
            if (carry) {
                result.push(carry)
            }
        }
        for (const ch of s) {
            if (ch === '1') {
                result.push(0)
            } else {
                break
            }
        }
        result.reverse()
        return Bytes.from(result)
    }

    /** @internal */
    function ripemd160Checksum(data: Uint8Array, suffix?: string) {
        const hash = ripemd160().update(data)
        if (suffix) {
            hash.update(suffix)
        }
        return hash.digest().slice(0, 4)
    }

    /** @internal */
    function dsha256Checksum(data: Uint8Array) {
        const round1 = sha256().update(data).digest()
        const round2 = sha256().update(round1).digest()
        return round2.slice(0, 4)
    }
}
