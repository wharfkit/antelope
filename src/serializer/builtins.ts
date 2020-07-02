import {ABIDecoder} from './decoder'
import {ABIEncoder} from './encoder'
import {ABIField, ABISerializableConstructor} from './serializable'
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
    VarInt,
    VarUInt,
} from '../chain/integer'
import {Asset} from '../chain/asset'
import {Checksum160, Checksum256, Checksum512} from '../chain/checksum'
import {Signature} from '../chain/signature'
import {PublicKey} from '../chain/public-key'
import {Struct} from '../chain/struct'
import {TimePoint, TimePointSec} from '../chain/time'

const StringType = {
    abiName: 'string',
    fromABI: (decoder: ABIDecoder) => {
        return decoder.readString()
    },
    from: (string: string): string => string,
    toABI: (string: string, encoder: ABIEncoder) => {
        encoder.writeString(string)
    },
}

const BoolType = {
    abiName: 'bool',
    fromABI: (decoder: ABIDecoder) => {
        return decoder.readByte() === 1
    },
    from: (value: boolean): boolean => value,
    toABI: (value: boolean, encoder: ABIEncoder) => {
        encoder.writeByte(value === true ? 1 : 0)
    },
}

export interface BuiltinTypes {
    asset: Asset
    'asset?'?: Asset
    'asset[]': Asset[]
    'asset[]?'?: Asset[]
    bool: boolean
    'bool?'?: boolean
    'bool[]': boolean[]
    'bool[]?'?: boolean[]
    bytes: Bytes
    'bytes?'?: Bytes
    'bytes[]': Bytes[]
    'bytes[]?'?: Bytes[]
    checksum160: Checksum160
    'checksum160?'?: Checksum160
    'checksum160[]': Checksum160[]
    'checksum160[]?'?: Checksum160[]
    checksum256: Checksum256
    'checksum256?'?: Checksum256
    'checksum256[]': Checksum256[]
    'checksum256[]?'?: Checksum256[]
    checksum512: Checksum512
    'checksum512?'?: Checksum512
    'checksum512[]': Checksum512[]
    'checksum512[]?'?: Checksum512[]
    name: Name
    'name?'?: Name
    'name[]': Name[]
    'name[]?'?: Name[]
    publickey: PublicKey
    'publickey?'?: PublicKey
    'publickey[]': PublicKey[]
    'publickey[]?'?: PublicKey[]
    signature: Signature
    'signature?'?: Signature
    'signature[]': Signature[]
    'signature[]?'?: Signature[]
    string: string
    'string?'?: string
    'string[]': string[]
    'string[]?'?: string[]
    symbol: Asset.Symbol
    'symbol?'?: Asset.Symbol
    'symbol[]': Asset.Symbol[]
    'symbol[]?'?: Asset.Symbol[]
    time_point: TimePoint
    'time_point?'?: TimePoint
    'time_point[]': TimePoint[]
    'time_point[]?'?: TimePoint[]
    time_point_sec: TimePointSec
    'time_point_sec?'?: TimePointSec
    'time_point_sec[]': TimePointSec[]
    'time_point_sec[]?'?: TimePointSec[]
    int8: Int8
    'int8?'?: Int8
    'int8[]': Int8[]
    'int8[]?'?: Int8[]
    int16: Int16
    'int16?'?: Int16
    'int16[]': Int16[]
    'int16[]?'?: Int16[]
    int32: Int32
    'int32?'?: Int32
    'int32[]': Int32[]
    'int32[]?'?: Int32[]
    int64: Int64
    'int64?'?: Int64
    'int64[]': Int64[]
    'int64[]?'?: Int64[]
    int128: Int128
    'int128?'?: Int128
    'int128[]': Int128[]
    'int128[]?'?: Int128[]
    int256: Int256
    'int256?'?: Int256
    'int256[]': Int256[]
    'int256[]?'?: Int256[]
    uint8: UInt8
    'uint8?'?: UInt8
    'uint8[]': UInt8[]
    'uint8[]?'?: UInt8[]
    uint16: UInt16
    'uint16?'?: UInt16
    'uint16[]': UInt16[]
    'uint16[]?'?: UInt16[]
    uint32: UInt32
    'uint32?'?: UInt32
    'uint32[]': UInt32[]
    'uint32[]?'?: UInt32[]
    uint64: UInt64
    'uint64?'?: UInt64
    'uint64[]': UInt64[]
    'uint64[]?'?: UInt64[]
    uint128: UInt128
    'uint128?'?: UInt128
    'uint128[]': UInt128[]
    'uint128[]?'?: UInt128[]
    uint256: UInt256
    'uint256?'?: UInt256
    'uint256[]': UInt256[]
    'uint256[]?'?: UInt256[]
    varint: VarInt
    'varint?'?: VarInt
    'varint[]': VarInt[]
    'varint[]?'?: VarInt[]
    varuint: VarUInt
    'varuint?'?: VarUInt
    'varuint[]': VarUInt[]
    'varuint[]?'?: VarUInt[]
}

const builtins = [
    // types represented by JavaScript builtins
    BoolType as ABISerializableConstructor,
    StringType as ABISerializableConstructor,
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
    TimePoint,
    TimePointSec,
    UInt128,
    UInt16,
    UInt256,
    UInt32,
    UInt64,
    UInt8,
    VarInt,
    VarUInt,
]

export type TypeLookup = {[name: string]: ABISerializableConstructor}

export function buildTypeLookup(additional: ABISerializableConstructor[] = []): TypeLookup {
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

export function getTypeName(object: any): string | undefined {
    if (object.constructor && object.constructor.abiName !== undefined) {
        return object.constructor.abiName
    }
    if (Array.isArray(object)) {
        const types = object.map(getTypeName)
        const type = types[0]
        if (!type || !types.every((t) => t === type)) {
            return
        }
        return type + '[]'
    }
    switch (typeof object) {
        case 'boolean':
            return 'bool'
        case 'string':
            return 'string'
    }
}

export function getType(object: any, name = 'jsobj'): ABISerializableConstructor | undefined {
    if (object.constructor && object.constructor.abiName !== undefined) {
        return object.constructor
    }
    if (Array.isArray(object)) {
        // check for array of all ABISerializableType with same type name
        const types = object.map((v) => {
            return getType(v, name)
        })
        const type = types[0]
        if (!type) {
            return // some type not known
        }
        if (!types.every((t) => t && t.abiName === type.abiName)) {
            return // not all types are the same
        }
        return type
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
    switch (objectType) {
        case 'boolean':
            return BoolType as ABISerializableConstructor
        case 'string':
            return StringType as ABISerializableConstructor
    }
}
