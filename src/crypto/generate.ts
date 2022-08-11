import {getCurve} from './curves'

/**
 * Generate a new private key for given type.
 * @internal
 */
export function generate(type: string) {
    const curve = getCurve(type)
    const privkey = curve.genKeyPair().getPrivate()
    return privkey.toArrayLike(Uint8Array as any, 'be', 32) as Uint8Array
}
