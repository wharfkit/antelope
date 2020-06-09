import {getCurve} from './curves'

/**
 * Derive shared secret for key pair.
 * @internal
 */
export function sharedSecret(privkey: Uint8Array, pubkey: Uint8Array, type: string) {
    const curve = getCurve(type)
    const priv = curve.keyFromPrivate(privkey)
    const pub = curve.keyFromPublic(pubkey).getPublic()
    return priv.derive(pub).toArrayLike(Uint8Array as any, 'be') as Uint8Array
}
