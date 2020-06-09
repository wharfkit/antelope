import {getCurve} from './curves'

/**
 * Verify signature using message and public key.
 * @internal
 */
export function verify(
    signature: Uint8Array,
    message: Uint8Array,
    pubkey: Uint8Array,
    type: string
) {
    const curve = getCurve(type)
    const r = signature.subarray(1, 33)
    const s = signature.subarray(33)
    return curve.verify(message, {r, s}, pubkey as any)
}
