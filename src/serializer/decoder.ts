/**
 * EOSIO ABI Decoder
 */

import BN from 'bn.js'

import {ABI, ABIType} from '../chain/abi'
import {Bytes, BytesType} from '../chain/bytes'

import {ABISerializable, ABISerializableType, synthesizeABI} from './serializable'
import {buildTypeLookup, builtins, getTypeName, TypeLookup} from './builtins'

interface DecodeArgs<T> {
    type: ABISerializableType<T> | string
    abi?: ABIType
    data?: BytesType
    json?: string
    object?: any
    customTypes?: ABISerializableType<any>[]
}

class DecodingError extends Error {
    ctx: DecodingContext
    underlyingError: Error
    constructor(ctx: DecodingContext, underlyingError: Error) {
        const path = ctx.codingPath
            .map(({field, type}) => {
                if (typeof field === 'number') {
                    return field
                } else {
                    return `${field}<${type.typeName}>`
                }
            })
            .join('.')
        super(`Decoding error at ${path}: ${underlyingError.message}`)
        this.stack = underlyingError.stack
        this.ctx = ctx
        this.underlyingError = underlyingError
    }
}

export function decode<T extends ABISerializable>(args: DecodeArgs<T>): T {
    const typeName = typeof args.type === 'string' ? args.type : args.type.abiName
    const customTypes = args.customTypes || []
    let abi: ABI
    if (args.abi) {
        abi = ABI.from(args.abi)
    } else {
        try {
            let type: ABISerializableType<T>
            if (typeof args.type === 'string') {
                const rName = new ABI.ResolvedType(args.type).name // type name w/o suffixes
                const builtin = builtins.find((t) => t.abiName === rName)
                if (!builtin) {
                    throw new Error(`Unknown builtin: ${args.type}`)
                }
                type = builtin as ABISerializableType<T>
            } else {
                type = args.type
            }
            const synthesized = synthesizeABI(type)
            abi = synthesized.abi
            customTypes.push(...synthesized.types)
        } catch (error) {
            throw Error(
                `Unable to synthesize ABI for: ${typeName} (${error.message}). ` +
                    'To decode non-class types you need to pass the ABI definition manually.'
            )
        }
    }
    const resolved = abi.resolveType(typeName)
    if (typeof args.type !== 'string') {
        customTypes.unshift(args.type)
    }

    const ctx: DecodingContext = {
        types: buildTypeLookup(customTypes),
        codingPath: [{field: 'root', type: resolved}],
    }

    try {
        if (args.data) {
            const bytes = Bytes.from(args.data)
            const decoder = new ABIDecoder(bytes.array)
            return decodeBinary(resolved, decoder, ctx)
        } else if (args.object !== undefined) {
            return decodeObject(args.object, resolved, ctx)
        } else if (args.json) {
            return decodeObject(JSON.parse(args.json), resolved, ctx)
        } else {
            throw new Error('Nothing to decode, you must set one of data, json, object')
        }
    } catch (error) {
        throw new DecodingError(ctx, error)
    }
}

interface DecodingContext {
    types: TypeLookup
    codingPath: {field: string | number; type: ABI.ResolvedType}[]
}

/** Marker for objects when they have been resolved, i.e. their types `from` factory method will not need to resolve children. */
export const Resolved = Symbol('Resolved')

function decodeBinary(type: ABI.ResolvedType, decoder: ABIDecoder, ctx: DecodingContext): any {
    if (type.isOptional) {
        if (decoder.readUint8() === 0) {
            return null
        }
    }
    if (type.isArray) {
        const len = decoder.readVaruint32()
        const rv: any[] = []
        for (let i = 0; i < len; i++) {
            ctx.codingPath.push({field: i, type})
            rv.push(decodeInner())
            ctx.codingPath.pop()
        }
        return rv
    } else {
        return decodeInner()
    }
    function decodeInner() {
        const abiType = ctx.types[type.name]
        if (abiType && abiType.fromABI) {
            return abiType.fromABI(decoder)
        } else {
            if (type.fields) {
                const rv: any = {}
                for (const field of type.fields) {
                    ctx.codingPath.push({field: field.name, type: field.type})
                    rv[field.name] = decodeBinary(field.type, decoder, ctx)
                    ctx.codingPath.pop()
                }
                if (abiType) {
                    rv[Resolved] = true
                    return abiType.from(rv)
                } else {
                    return rv
                }
            } else if (type.variant) {
                const vIdx = decoder.readUint8()
                const vType = type.variant[vIdx]
                if (!vType) {
                    throw new Error(`Unknown variant idx: ${vIdx}`)
                }
                ctx.codingPath.push({field: `v${vIdx}`, type: vType})
                const rv = [vType.typeName, decodeBinary(vType, decoder, ctx)]
                ctx.codingPath.pop()
                if (abiType) {
                    return abiType.from(rv)
                } else {
                    return rv
                }
            } else if (abiType) {
                throw new Error('Invalid type')
            } else {
                throw new Error('Unknown type')
            }
        }
    }
}

function decodeObject(value: any, type: ABI.ResolvedType, ctx: DecodingContext): any {
    if (value === null || value === undefined) {
        if (type.isOptional) {
            return null
        } else {
            throw new Error(`Unexpectedly encountered ${value} for non-optional`)
        }
    } else if (type.isArray) {
        if (!Array.isArray(value)) {
            throw new Error('Expected array')
        }
        const rv: any[] = []
        const len = value.length
        for (let i = 0; i < len; i++) {
            ctx.codingPath.push({field: i, type})
            rv.push(decodeInner(value[i]))
            ctx.codingPath.pop()
        }
        return rv
    } else {
        return decodeInner(value)
    }
    function decodeInner(value: any) {
        while (type.ref) {
            type = type.ref
        }
        const abiType = ctx.types[type.name]
        if (type.fields) {
            if (typeof value !== 'object') {
                throw new Error('Expected object')
            }
            if (typeof abiType === 'function' && value instanceof abiType) {
                return value
            }
            const struct: any = {}
            for (const field of type.fields) {
                ctx.codingPath.push({field: field.name, type: field.type})
                struct[field.name] = decodeObject(value[field.name], field.type, ctx)
                ctx.codingPath.pop()
            }
            if (abiType) {
                struct[Resolved] = true
                return abiType.from(struct)
            } else {
                return struct
            }
        } else if (type.variant) {
            let vName = getTypeName(value)
            if (
                !vName &&
                Array.isArray(value) &&
                value.length === 2 &&
                typeof value[0] === 'string'
            ) {
                vName = value[0]
                value = value[1]
            }
            const vIdx = type.variant.findIndex((t) => t.typeName === vName)
            if (vIdx === -1) {
                throw new Error(`Unknown variant type: ${vName}`)
            }
            const vType = type.variant[vIdx]
            ctx.codingPath.push({field: `v${vIdx}`, type: vType})
            const rv = [vType.typeName, decodeObject(value, vType, ctx)]
            ctx.codingPath.pop()
            if (abiType) {
                rv[Resolved] = true
                return abiType.from(rv)
            } else {
                return rv
            }
        } else {
            if (!abiType) {
                throw new Error('Unknown type')
            }
            return abiType.from(value)
        }
    }
}

export class ABIDecoder {
    private pos = 0
    private data: DataView
    private textDecoder = new TextDecoder()

    constructor(private array: Uint8Array) {
        this.data = new DataView(array.buffer)
    }

    canRead(bytes: number): boolean {
        return !(this.pos + bytes > this.array.byteLength)
    }

    private ensure(bytes: number) {
        if (!this.canRead(bytes)) {
            throw new Error('Read past end of buffer')
        }
    }

    readInt8(): number {
        this.ensure(1)
        const rv = this.data.getInt8(this.pos)
        this.pos += 1
        return rv
    }

    readInt16(): number {
        this.ensure(2)
        const rv = this.data.getInt16(this.pos, true)
        this.pos += 2
        return rv
    }

    readInt32(): number {
        this.ensure(4)
        const rv = this.data.getInt32(this.pos, true)
        this.pos += 4
        return rv
    }

    readInt64(): BN {
        this.ensure(8)
        const rv = new BN(this.array.subarray(this.pos, this.pos + 8), 'le')
        this.pos += 8
        return rv.fromTwos(64)
    }

    readUint8(): number {
        this.ensure(1)
        const rv = this.data.getUint8(this.pos)
        this.pos += 1
        return rv
    }

    readUint16(): number {
        this.ensure(2)
        const rv = this.data.getUint16(this.pos, true)
        this.pos += 2
        return rv
    }

    readUint32(): number {
        this.ensure(4)
        const rv = this.data.getUint32(this.pos, true)
        this.pos += 4
        return rv
    }

    readUint64(): BN {
        this.ensure(8)
        const rv = new BN(this.array.subarray(this.pos, this.pos + 8), 'le')
        this.pos += 8
        return rv
    }

    readVaruint32() {
        let v = 0
        let bit = 0
        for (;;) {
            const b = this.readUint8()
            v |= (b & 0x7f) << bit
            bit += 7
            if (!(b & 0x80)) {
                break
            }
        }
        return v >>> 0
    }

    readVarint32() {
        const v = this.readVaruint32()
        if (v & 1) {
            return (~v >> 1) | 0x8000_0000
        } else {
            return v >>> 1
        }
    }

    readArray(length: number) {
        this.ensure(length)
        const rv = this.array.subarray(this.pos, this.pos + length)
        this.pos += length
        return rv
    }

    readString() {
        const length = this.readVaruint32()
        return this.textDecoder.decode(this.readArray(length))
    }
}
