import {encode as abiEncode} from './encoder'
import {decode as abiDecode} from './decoder'
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
    export function synthesize(type: ABISerializableConstructor) {
        return synthesizeABI(type).abi
    }
}
