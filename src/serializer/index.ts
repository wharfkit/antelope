import {abiEncode} from './encoder'
import {abiDecode} from './decoder'
import {ABISerializableConstructor, synthesizeABI} from './serializable'

export {ABIEncoder} from './encoder'
export {ABIDecoder} from './decoder'

export type {
    ABISerializable,
    ABISerializableType,
    ABISerializableObject,
    ABISerializableConstructor,
} from './serializable'

export namespace Serializer {
    export const encode = abiEncode
    export const decode = abiDecode
    /** Create an EOSIO ABI definition for given core type. */
    export function synthesize(type: ABISerializableConstructor) {
        return synthesizeABI(type).abi
    }
    /** Create JSON representation of a core object. */
    export function stringify(object: any) {
        return JSON.stringify(object)
    }
    /** Create a vanilla js representation of a core object. */
    export function objectify(object: any) {
        return JSON.parse(JSON.stringify(object))
    }
}
