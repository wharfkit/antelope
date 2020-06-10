import {ABIDecoder} from './decoder'
import {ABIEncoder} from './encoder'
import {ABIField, ABISerializableType} from './serializable'
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
import {Checksum160, Checksum256, Checksum512} from '../chain/checksum'
import {Signature} from '../chain/signature'
import {PublicKey} from '../chain/public-key'
import {Struct} from '../chain/struct'

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
    Checksum160,
    Checksum256,
    Checksum512,
    Int128,
    Int16,
    Int256,
    Int32,
    Int64,
    Int8,
    Name,
    PublicKey,
    Signature,
    UInt128,
    UInt16,
    UInt256,
    UInt32,
    UInt64,
    UInt8,
]

export type TypeLookup = {[name: string]: ABISerializableType}

export function buildTypeLookup(additional: ABISerializableType[] = []): TypeLookup {
    const rv: TypeLookup = {}
    for (const type of builtins) {
        rv[type.abiName] = type
    }
    for (const type of additional) {
        // TODO: check conformance?
        rv[type.abiName] = type
    }
    return rv
}

export function getType(object: any, name = 'jsobj'): ABISerializableType<any> | undefined {
    if (object.constructor && object.constructor['abiName'] !== undefined) {
        return object.constructor
    }
    const objectType = typeof object
    if (objectType === 'object' && object !== null) {
        const fields: ABIField[] = Object.keys(object).map((key) => {
            return {name: key, type: getType(object[key], name + '_nested')!}
        })
        if (fields.find((field) => !field.type)) {
            return // encountered unknown type
        }
        return class extends Struct {
            static abiName = name
            static abiFields = fields
        }
    }
    switch (typeof object) {
        case 'boolean':
            return BoolType
        case 'string':
            return StringType
    }
}
