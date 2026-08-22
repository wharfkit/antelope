import {getCurve} from './curves'

/**
 * Sign digest using private key.
 * @internal
 */
export function sign(secret: Uint8Array, message: Uint8Array, type: string) {
    const curve = getCurve(type)
    let recid: number
    let r: Uint8Array
    let s: Uint8Array
    if (type === 'K1') {
        let attempt = 1
        do {
            const sig = curve.sign(message, secret, {
                prehash: false,
                format: 'recovered',
                lowS: true,
                extraEntropy: new Uint8Array([attempt++]),
            })
            recid = sig[0]
            r = sig.subarray(1, 33)
            s = sig.subarray(33, 65)
        } while (!isCanonical(r, s))
    } else {
        const sig = curve.sign(message, secret, {
            prehash: false,
            format: 'recovered',
            lowS: true,
        })
        recid = sig[0]
        r = sig.subarray(1, 33)
        s = sig.subarray(33, 65)
    }
    return {type, r, s, recid: recid || 0}
}

/**
 * Here be dragons
 * - https://github.com/steemit/steem/issues/1944
 * - https://github.com/EOSIO/eos/issues/6699
 * @internal
 */
function isCanonical(r: Uint8Array, s: Uint8Array) {
    return (
        !(r[0] & 0x80) &&
        !(r[0] === 0 && !(r[1] & 0x80)) &&
        !(s[0] & 0x80) &&
        !(s[0] === 0 && !(s[1] & 0x80))
    )
}
