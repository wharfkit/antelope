import {getCurve} from './curves'

/**
 * Recover public key from signature and recovery id.
 * @internal
 */
export function recover(signature: Uint8Array, message: Uint8Array, type: string) {
    const curve = getCurve(type)
    const recid = signature[0] - 31
    const r = signature.subarray(1, 33)
    const s = signature.subarray(33)
    const point = curve.recoverPubKey(message, {r, s}, recid)
    return new Uint8Array(point.encodeCompressed())
}
