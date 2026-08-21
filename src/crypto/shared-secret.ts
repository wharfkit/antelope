import {getCurve} from './curves'

/**
 * Derive shared secret for key pair.
 * @internal
 */
export function sharedSecret(
    privkey: Uint8Array,
    pubkey: Uint8Array,
    type: string,
    legacy = false
) {
    const curve = getCurve(type)
    const sharedPoint = curve.getSharedSecret(privkey, pubkey)
    const x = sharedPoint.slice(1, 33)
    if (legacy) {
        // strip leading zero bytes, replicating the elliptic-based derivation used before v2
        let offset = 0
        while (offset < x.length - 1 && x[offset] === 0) {
            offset++
        }
        return x.slice(offset)
    }
    return x
}
