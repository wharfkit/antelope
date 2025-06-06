import {getCurve} from './curves'

import {KeyType} from '../'

/**
 * Recover public key from signature and recovery id.
 * @internal
 */
export function recover(signature: Uint8Array, message: Uint8Array, type: string) {
    if (type === KeyType.WA) {
        throw new Error(`can't recover webauthn public keys, please use @wharfkit/webauthn.`)
    }
    const curve = getCurve(type)
    const recid = signature[0] - 31
    const r = signature.subarray(1, 33)
    const s = signature.subarray(33, 33 + 32)
    const point = curve.recoverPubKey(message, {r, s}, recid)
    return new Uint8Array(point.encodeCompressed())
}
