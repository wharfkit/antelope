import {secp256k1} from '@noble/curves/secp256k1.js'
import {p256} from '@noble/curves/nist.js'
import type {ECDSA} from '@noble/curves/abstract/weierstrass.js'

const curves: {[type: string]: ECDSA} = {}

/**
 * Get curve for key type.
 * @internal
 */
export function getCurve(type: string): ECDSA {
    let rv = curves[type]
    if (!rv) {
        if (type === 'K1') {
            rv = curves[type] = secp256k1
        } else if (type === 'R1') {
            rv = curves[type] = p256
        } else if (type === 'WA') {
            rv = curves[type] = p256
        } else {
            throw new Error(`Unknown curve type: ${type}`)
        }
    }
    return rv
}
