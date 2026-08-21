import {getCurve} from './curves'

/**
 * Derive shared secret for key pair.
 * @internal
 */
export function sharedSecret(privkey: Uint8Array, pubkey: Uint8Array, type: string) {
    const curve = getCurve(type)
    const sharedPoint = curve.getSharedSecret(privkey, pubkey)
    return sharedPoint.slice(1, 33)
}
