import {getCurve} from './curves'

/**
 * Get public key corresponding to given private key.
 * @internal
 */
export function getPublic(privkey: Uint8Array, type: string) {
    const curve = getCurve(type)
    const key = curve.keyFromPrivate(privkey)
    const point = key.getPublic()
    return new Uint8Array(point.encodeCompressed())
}
