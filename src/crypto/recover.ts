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
    const recoveredSig = new Uint8Array(65)
    recoveredSig[0] = recid
    recoveredSig.set(r, 1)
    recoveredSig.set(s, 33)
    return curve.recoverPublicKey(recoveredSig, message, {prehash: false})
}
