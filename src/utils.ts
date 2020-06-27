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

const hexLookup: {enc?: Array<string>; dec?: Record<string, number>} = {}
function buildHexLookup() {
    hexLookup.enc = new Array<string>(0xff)
    hexLookup.dec = {}
    for (let i = 0; i <= 0xff; ++i) {
        const b = i.toString(16).padStart(2, '0')
        hexLookup.enc[i] = b
        hexLookup.dec[b] = i
    }
}

export function arrayToHex(array: ArrayLike<number>) {
    if (!hexLookup.enc) {
        buildHexLookup()
    }
    const len = array.length
    const rv = new Array<string>(len)
    for (let i = 0; i < len; ++i) {
        rv[i] = hexLookup.enc![array[i]]
    }
    return rv.join('')
}

export function hexToArray(hex: string) {
    if (!hexLookup.dec) {
        buildHexLookup()
    }
    if (typeof hex !== 'string') {
        throw new Error('Expected string containing hex digits')
    }
    if (hex.length % 2) {
        throw new Error('Odd number of hex digits')
    }
    hex = hex.toLowerCase()
    const len = hex.length / 2
    const result = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
        const b = hexLookup.dec![hex[i * 2] + hex[i * 2 + 1]]
        if (b === undefined) {
            throw new Error('Expected hex string')
        }
        result[i] = b
    }
    return result
}
