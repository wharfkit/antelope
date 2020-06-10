import {encode as abiEncode} from './encoder'
import {decode as abiDecode} from './decoder'
import {ABISerializableType, synthesizeABI} from './serializable'

export namespace Serializer {
    export const encode = abiEncode
    export const decode = abiDecode
    export function synthesize(type: ABISerializableType) {
        return synthesizeABI(type).abi
    }
}
