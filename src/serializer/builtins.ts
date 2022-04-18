import {ABIDecoder} from './decoder'
import {ABIEncoder} from './encoder'
import {ABIField, ABISerializableConstructor} from './serializable'

import {
    Asset,
    BlockTimestamp,
    Bytes,
    Checksum160,
    Checksum256,
    Checksum512,
    ExtendedAsset,
    Float128,
    Float32,
    Float64,
    Int128,
    Int16,
    Int32,
    Int64,
    Int8,
    Name,
    PublicKey,
    Signature,
    Struct,
    TimePoint,
    TimePointSec,
    UInt128,
    UInt16,
    UInt32,
    UInt64,
    UInt8,
    VarInt,
    VarUInt,
} from '../chain'

const StringType = {
    abiName: 'string',
    abiDefault: () => '',
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
    abiDefault: () => false,
    fromABI: (decoder: ABIDecoder) => {
        return decoder.readByte() === 1
    },
    from: (value: boolean): boolean => value,
    toABI: (value: boolean, encoder: ABIEncoder) => {
        encoder.writeByte(value === true ? 1 : 0)
    },
}

export interface BuiltinTypes {
    string: string
    'string?'?: string
    'string[]': string[]
    'string[]?'?: string[]
    bool: boolean
    'bool?'?: boolean
    'bool[]': boolean[]
    'bool[]?'?: boolean[]
    asset: Asset
    'asset?'?: Asset
    'asset[]': Asset[]
    'asset[]?'?: Asset[]
    extended_asset: ExtendedAsset
    'extended_asset?'?: ExtendedAsset
    'extended_asset[]': ExtendedAsset[]
    'extended_asset[]?'?: ExtendedAsset[]
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
    symbol: Asset.Symbol
    'symbol?'?: Asset.Symbol
    'symbol[]': Asset.Symbol[]
    'symbol[]?'?: Asset.Symbol[]
    symbol_code: Asset.SymbolCode
    'symbol_code?'?: Asset.SymbolCode
    'symbol_code[]': Asset.SymbolCode[]
    'symbol_code[]?'?: Asset.SymbolCode[]
    time_point: TimePoint
    'time_point?'?: TimePoint
    'time_point[]': TimePoint[]
    'time_point[]?'?: TimePoint[]
    time_point_sec: TimePointSec
    'time_point_sec?'?: TimePointSec
    'time_point_sec[]': TimePointSec[]
    'time_point_sec[]?'?: TimePointSec[]
    block_timestamp_type: BlockTimestamp
    'block_timestamp_type?'?: BlockTimestamp
    'block_timestamp_type[]': BlockTimestamp[]
    'block_timestamp_type[]?'?: BlockTimestamp[]
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
    varint: VarInt
    'varint?'?: VarInt
    'varint[]': VarInt[]
    'varint[]?'?: VarInt[]
    varuint: VarUInt
    'varuint?'?: VarUInt
    'varuint[]': VarUInt[]
    'varuint[]?'?: VarUInt[]
    float32: Float32
    'float32?'?: Float32
    'float32[]': Float32[]
    'float32[]?'?: Float32[]
    float64: Float64
    'float64?'?: Float64
    'float64[]': Float64[]
    'float64[]?'?: Float64[]
    float128: Float128
    'float128?'?: Float128
    'float128[]': Float128[]
    'float128[]?'?: Float128[]
}

function getBuiltins(): ABISerializableConstructor[] {
    return [
        // types represented by JavaScript builtins
        BoolType as ABISerializableConstructor,
        StringType as ABISerializableConstructor,
        // types represented by Classes
        Asset,
        Asset.Symbol,
        Asset.SymbolCode,
        BlockTimestamp,
        Bytes,
        Checksum160,
        Checksum256,
        Checksum512,
        ExtendedAsset,
        Float128,
        Float32,
        Float64,
        Int128,
        Int16,
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
        UInt32,
        UInt64,
        UInt8,
        VarInt,
        VarUInt,
    ]
}

export type TypeLookup = {[name: string]: ABISerializableConstructor}

export function buildTypeLookup(additional: ABISerializableConstructor[] = []): TypeLookup {
    const rv: TypeLookup = {}
    const builtins = getBuiltins()
    for (const type of builtins) {
        rv[type.abiName] = type
    }
    for (const type of additional) {
        if (!type.abiName) {
            throw new Error('Invalid type')
        }
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
