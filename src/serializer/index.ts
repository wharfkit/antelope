import {encode as abiEncode} from './encoder'
import {decode as abiDecode} from './decoder'

export namespace Serializer {
    export const encode = abiEncode
    export const decode = abiDecode
}
