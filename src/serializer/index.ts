import {encode as abiEncode} from './encoder'
import {decode as abiDecode} from './decoder'
import {synthesizeABI} from './serializable'

export namespace Serializer {
    export const encode = abiEncode
    export const decode = abiDecode
    export const synthesize = synthesizeABI
}
