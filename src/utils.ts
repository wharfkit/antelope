export function arrayEquals(a: ArrayLike<number>, b: ArrayLike<number>) {
    const len = a.length
    if (len !== b.length) {
        return false
    }
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) {
            return false
        }
    }
    return true
}

let hexLookup: string[] | undefined
export function arrayToHex(array: Uint8Array) {
    if (!hexLookup) {
        hexLookup = new Array<string>(0xff)
        for (let i = 0; i <= 0xff; ++i) {
            hexLookup[i] = i.toString(16).padStart(2, '0')
        }
    }
    const len = array.byteLength
    const rv = new Array<string>(len)
    for (let i = 0; i < array.byteLength; ++i) {
        rv[i] = hexLookup[array[i]]
    }
    return rv.join('')
}

export function hexToArray(hex: string) {
    if (typeof hex !== 'string') {
        throw new Error('Expected string containing hex digits')
    }
    if (hex.length % 2) {
        throw new Error('Odd number of hex digits')
    }
    const l = hex.length / 2
    const result = new Uint8Array(l)
    for (let i = 0; i < l; ++i) {
        const x = parseInt(hex.substr(i * 2, 2), 16)
        if (Number.isNaN(x)) {
            throw new Error('Expected hex string')
        }
        result[i] = x
    }
    return result
}
