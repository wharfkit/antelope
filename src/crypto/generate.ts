import {getCurve} from './curves'

/**
 * Generate a new private key for given type.
 * @internal
 */
export function generate(type: string) {
    const curve = getCurve(type)
    return curve.utils.randomSecretKey()
}
