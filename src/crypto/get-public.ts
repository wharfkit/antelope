import {getCurve} from './curves'

/**
 * Get public key corresponding to given private key.
 * @internal
 */
export function getPublic(privkey: Uint8Array, type: string) {
    const curve = getCurve(type)
    return curve.getPublicKey(privkey, true)
}
