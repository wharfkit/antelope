/**
 * EOSIO ABI Encoder
 */

import BN from 'bn.js'

import {ABI, ABIType} from '../chain/abi'
import {Bytes} from '../chain/bytes'

import {ABISerializable, ABISerializableType, synthesizeABI} from './serializable'
import {buildTypeLookup} from './builtins'

interface EncodeArgs {
    object: ABISerializable | any
    abi?: ABIType
    type?: ABISerializableType<any> | string
    customTypes?: ABISerializableType<any>[]
}

export function encode(args: EncodeArgs): Bytes {
    let type: ABISerializableType<any> | undefined
    let typeName: string
    if (typeof args.type === 'string') {
        typeName = args.type
    } else if (args.type && args.type.abiName !== undefined) {
        type = args.type
        typeName = args.type.abiName
    } else if (args.object.constructor && args.object.constructor['abiName'] !== undefined) {
        type = args.object.constructor
        typeName = args.object.constructor.abiName
    } else {
        switch (typeof args.object) {
            case 'boolean':
                typeName = 'bool'
                break
            case 'string':
                typeName = 'string'
                break
            default:
                throw new Error(
                    'Unable to determine the type of the object to be encoded. ' +
                        'To encode custom ABI types you must pass the type argument.'
                )
        }
    }

    const customTypes = args.customTypes || []
    if (type) {
        customTypes.unshift(type)
    }
    const types = buildTypeLookup(customTypes)

    let rootType: ABI.ResolvedType
    if (args.abi) {
        rootType = ABI.from(args.abi).resolveType(typeName)
    } else if (type) {
        rootType = synthesizeABI(type).resolveType(typeName)
    } else {
        // TODO: sanity check that we actually have the type?
        rootType = new ABI.ResolvedType(typeName)
    }

    const encoder = new ABIEncoder()
    encodeAny(args.object, rootType, {types, encoder})
    return Bytes.from(encoder.getData())
}

export function encodeAny(value: any, type: ABI.ResolvedType, ctx: EncodingContext) {
    const valueExists = value !== undefined && value !== null
    if (type.isOptional) {
        ctx.encoder.writeUint8(valueExists ? 1 : 0)
    } else if (!valueExists) {
        throw new Error(`Found ${value} for non-optional type: ${type.typeName}`)
    }
    if (!valueExists) {
        return
    }
    if (type.isArray) {
        if (!Array.isArray(value)) {
            throw new Error(`Expected array for: ${type.typeName}`)
        }
        ctx.encoder.writeVaruint32(value.length)
        value.map(encodeInner)
    } else {
        encodeInner(value)
    }
    function encodeInner(value: any) {
        const abiType = ctx.types[type.name]
        if (abiType && abiType.toABI) {
            // type explicitly handles encoding
            abiType.toABI(value, ctx.encoder)
        } else if (typeof value.toABI === 'function') {
            // instance handles encoding
            if (value.constructor.abiName !== type.name) {
                throw new Error(
                    `Type mispmatch, encountered ${value.constructor.abiName} but expected: ${type.name}`
                )
            }
            value.toABI(ctx.encoder)
        } else {
            // encode according to abi def if possible
            if (type.fields) {
                if (typeof value !== 'object') {
                    throw new Error(`Expected object for: ${type.name}`)
                }
                for (const field of type.fields) {
                    encodeAny(value[field.name], field.type, ctx)
                }
            } else if (type.variant) {
                throw new Error('TODO: handle variant encoding')
            } else {
                if (!abiType) {
                    throw new Error(`Unknown type: ${type.typeName}`)
                }
                const instance = abiType.from(value)
                if (!instance.toABI) {
                    throw new Error(`Invalid type ${type.name}, no encoding methods implemented`)
                }
                instance.toABI(ctx.encoder)
            }
        }
    }
}

interface EncodingContext {
    encoder: ABIEncoder
    types: ReturnType<typeof buildTypeLookup>
}

export class ABIEncoder {
    private pos = 0
    private data: DataView
    private array: Uint8Array

    private textEncoder = new TextEncoder()

    constructor(private pageSize = 1024) {
        const buffer = new ArrayBuffer(pageSize)
        this.data = new DataView(buffer)
        this.array = new Uint8Array(buffer)
    }

    private ensure(bytes: number) {
        if (this.data.byteLength >= this.pos + bytes) {
            return
        }
        const pages = Math.ceil(bytes / this.pageSize)
        const newSize = this.data.byteLength + this.pageSize * pages
        const buffer = new ArrayBuffer(newSize)
        const data = new DataView(buffer)
        const array = new Uint8Array(buffer)
        array.set(this.array)
        this.data = data
        this.array = array
    }

    writeBytes(bytes: ArrayLike<number>) {
        const size = bytes.length
        this.ensure(size)
        this.array.set(bytes, this.pos)
        this.pos += size
    }

    writeInt8(value: number) {
        this.ensure(1)
        this.data.setInt8(this.pos++, value)
    }

    writeInt16(value: number) {
        this.ensure(2)
        this.data.setInt16(this.pos, value)
        this.pos += 2
    }

    writeInt32(value: number) {
        this.ensure(4)
        this.data.setInt32(this.pos, value)
        this.pos += 4
    }

    writeInt64(value: BN) {
        this.writeBytes(value.toTwos(64).toArrayLike(Uint8Array as any, 'le', 8))
    }

    writeUint8(value: number) {
        this.ensure(1)
        this.data.setUint8(this.pos++, value)
    }

    writeUint16(value: number) {
        this.ensure(2)
        this.data.setUint16(this.pos, value)
        this.pos += 2
    }

    writeUint32(value: number) {
        this.ensure(4)
        this.data.setUint32(this.pos, value)
        this.pos += 4
    }

    writeUint64(value: BN) {
        this.writeBytes(value.toArrayLike(Uint8Array as any, 'le', 8))
    }

    writeFloat32(value: number) {
        this.ensure(4)
        this.data.setFloat32(this.pos, value)
        this.pos += 4
    }

    writeFloat64(value: number) {
        this.ensure(8)
        this.data.setFloat64(this.pos, value)
        this.pos += 8
    }

    writeVaruint32(v: number) {
        this.ensure(4)
        for (;;) {
            if (v >>> 7) {
                this.array[this.pos++] = 0x80 | (v & 0x7f)
                v = v >>> 7
            } else {
                this.array[this.pos++] = v
                break
            }
        }
    }

    writeVarint32(v: number) {
        this.writeVaruint32((v << 1) ^ (v >> 31))
    }

    writeBn(v: BN, endian?: BN.Endianness, length?: number) {
        this.writeBytes(v.toArrayLike(Uint8Array as any, endian, length))
    }

    writeString(v: string) {
        this.writeVaruint32(v.length)
        this.writeBytes(this.textEncoder.encode(v))
    }

    getData(): Uint8Array {
        return new Uint8Array(this.array.buffer, this.array.byteOffset, this.pos)
    }
}
