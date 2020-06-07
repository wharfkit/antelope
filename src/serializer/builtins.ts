import {ABIDecoder} from './decoder'
import {ABIEncoder} from './encoder'
import {ABISerializableType} from './serializable'
import {Bytes} from '../chain/bytes'
import {Name} from '../chain/name'

import {
    Int128,
    Int16,
    Int256,
    Int32,
    Int64,
    Int8,
    UInt128,
    UInt16,
    UInt256,
    UInt32,
    UInt64,
    UInt8,
} from '../chain/integer'
import {Asset} from '../chain/asset'

const StringType: ABISerializableType<string> = {
    abiName: 'string',
    fromABI: (decoder: ABIDecoder) => {
        return decoder.readString()
    },
    from: (string: string): string => string,
    toABI: (string: string, encoder: ABIEncoder) => {
        encoder.writeString(string)
    },
}

const BoolType: ABISerializableType<boolean> = {
    abiName: 'bool',
    fromABI: (decoder: ABIDecoder) => {
        return decoder.readUint8() === 1
    },
    from: (value: boolean): boolean => value,
    toABI: (value: boolean, encoder: ABIEncoder) => {
        encoder.writeUint8(value === true ? 1 : 0)
    },
}

export const builtins: ABISerializableType<any>[] = [
    // types represented by JavaScript builtins
    BoolType,
    StringType,
    // types represented by Classes
    Asset,
    Asset.Symbol,
    Bytes,
    Int128,
    Int16,
    Int256,
    Int32,
    Int64,
    Int8,
    Name,
    UInt128,
    UInt16,
    UInt256,
    UInt32,
    UInt64,
    UInt8,
]

export function buildTypeLookup(additional: ABISerializableType[] = []) {
    const rv: {[name: string]: ABISerializableType} = {}
    for (const type of builtins) {
        rv[type.abiName] = type
    }
    for (const type of additional) {
        // TODO: check conformance?
        rv[type.abiName] = type
    }
    return rv
}
