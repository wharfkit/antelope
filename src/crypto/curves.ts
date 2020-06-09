import {ec} from 'elliptic'

const curves: {[type: string]: ec} = {}

/**
 * Get curve for key type.
 * @internal
 */
export function getCurve(type: string): ec {
    let rv = curves[type]
    if (!rv) {
        if (type === 'K1') {
            rv = curves[type] = new ec('secp256k1')
        } else if (type === 'R1') {
            rv = curves[type] = new ec('p256')
        } else {
            throw new Error(`Unknown curve type: ${type}`)
        }
    }
    return rv
}
