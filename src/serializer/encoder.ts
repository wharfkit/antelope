/**
 * Antelope/EOSIO ABI Encoder
 */
import {ABI, ABIDef, Bytes, Variant} from '../chain'
import {isInstanceOf} from '../utils'

import {
    ABISerializable,
    ABISerializableConstructor,
    ABISerializableObject,
    ABISerializableType,
    abiTypeString,
    isTypeDescriptor,
    synthesizeABI,
} from './serializable'
import {buildTypeLookup, getType, getTypeName} from './builtins'

class EncodingError extends Error {
    static __className = 'EncodingError'
    ctx: EncodingContext
    underlyingError: Error
    constructor(ctx: EncodingContext, underlyingError: Error) {
        const path = ctx.codingPath
            .map(({field, type}) => {
                if (typeof field === 'number') {
                    return field
                } else {
                    return `${field}<${type.typeName}>`
                }
            })
            .join('.')
        super(`Encoding error at ${path}: ${underlyingError.message}`)
        this.stack = underlyingError.stack
        this.ctx = ctx
        this.underlyingError = underlyingError
    }
}

interface EncodeArgsBase {
    /**
     * ABI definition to use when encoding.
     */
    abi?: ABIDef
    /**
     * Additional types to use when encoding, can be used to pass type constructors
     * that should be used when encountering a custom type.
     */
    customTypes?: ABISerializableConstructor[]
    /**
     * Can be passed to use a custom ABIEncoder instance.
     */
    encoder?: ABIEncoder
    /**
     * Optional metadata to pass to the encoder.
     */
    metadata?: Record<string, any>
}

interface EncodeArgsUntyped extends EncodeArgsBase {
    /**
     * Object to encode, either a object conforming to `ABISerializable`
     * or a JavaScript object, when the latter is used an the `type`
     * argument must also be set.
     */
    object: any
    /**
     * Type to use when encoding the given object, either a type constructor
     * or a string name of a builtin type or a custom type in the given `abi`.
     */
    type: ABISerializableType
}

interface EncodeArgsSerializable extends EncodeArgsBase {
    /**
     * Object conforming to `ABISerializable` to be encoded.
     */
    object: ABISerializable
    /**
     * Optional type-override for given serializable object.
     */
    type?: ABISerializableType
}

export type EncodeArgs = EncodeArgsSerializable | EncodeArgsUntyped

export function abiEncode(args: EncodeArgs): Bytes {
    let type: ABISerializableConstructor | undefined
    let typeName: string | undefined
    if (typeof args.type === 'string') {
        typeName = args.type
    } else if (args.type && isTypeDescriptor(args.type)) {
        if (typeof args.type.type !== 'string') {
            type = args.type.type
        }
        typeName = abiTypeString(args.type)
    } else if (args.type && args.type.abiName !== undefined) {
        type = args.type
        typeName = args.type.abiName
    } else {
        type = getType(args.object)
        if (type) {
            typeName = type.abiName
            if (Array.isArray(args.object)) {
                typeName += '[]'
            }
        }
    }

    const customTypes = args.customTypes ? args.customTypes.slice() : []
    if (type) {
        customTypes.unshift(type)
    } else if (typeName) {
        const rootName = new ABI.ResolvedType(typeName).name
        type = customTypes.find((t) => t.abiName === rootName)
    }
    let rootType: ABI.ResolvedType
    if (args.abi && typeName) {
        rootType = ABI.from(args.abi).resolveType(typeName)
    } else if (type) {
        const synthesized = synthesizeABI(type)
        rootType = synthesized.abi.resolveType(typeName || type.abiName)
        customTypes.push(...synthesized.types)
    } else if (typeName) {
        rootType = new ABI.ResolvedType(typeName)
    } else {
        throw new Error(
            'Unable to determine the type of the object to be encoded. ' +
                'To encode custom ABI types you must pass the type argument.'
        )
    }
    const types = buildTypeLookup(customTypes)
    const encoder = args.encoder || new ABIEncoder()
    if (args.metadata) {
        encoder.metadata = args.metadata
    }
    const ctx: EncodingContext = {
        types,
        encoder,
        codingPath: [{field: 'root', type: rootType}],
    }
    try {
        encodeAny(args.object, rootType, ctx)
    } catch (error) {
        throw new EncodingError(ctx, error)
    }
    return Bytes.from(encoder.getData())
}

export function encodeAny(value: any, type: ABI.ResolvedType, ctx: EncodingContext) {
    const valueExists = value !== undefined && value !== null
    if (type.isOptional) {
        ctx.encoder.writeByte(valueExists ? 1 : 0)
        if (!valueExists) {
            return
        }
    }
    if (type.isArray) {
        if (!Array.isArray(value)) {
            throw new Error(`Expected array for: ${type.typeName}`)
        }
        const len = value.length
        ctx.encoder.writeVaruint32(len)
        for (let i = 0; i < len; i++) {
            ctx.codingPath.push({field: i, type})
            encodeInner(value[i])
            ctx.codingPath.pop()
        }
    } else {
        encodeInner(value)
    }
    function encodeInner(value: any) {
        const abiType = ctx.types[type.name]
        if (type.ref && !abiType) {
            // type is alias, follow it
            encodeAny(value, type.ref, ctx)
            return
        }
        if (!valueExists) {
            if (type.isExtension) {
                return
            }
            throw new Error(`Found ${value} for non-optional type: ${type.typeName}`)
        }
        if (abiType && abiType.toABI) {
            // type explicitly handles encoding
            abiType.toABI(value, ctx.encoder)
        } else if (typeof value.toABI === 'function' && value.constructor.abiName === type.name) {
            // instance handles encoding
            value.toABI(ctx.encoder)
        } else {
            // encode according to abi def if possible
            if (type.fields) {
                if (typeof value !== 'object') {
                    throw new Error(`Expected object for: ${type.name}`)
                }
                const fields = type.allFields
                if (!fields) {
                    throw new Error('Invalid struct fields')
                }
                for (const field of fields) {
                    ctx.codingPath.push({field: field.name, type: field.type})
                    encodeAny(value[field.name], field.type, ctx)
                    ctx.codingPath.pop()
                }
            } else if (type.variant) {
                let vName: string | undefined
                if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'string') {
                    vName = value[0]
                    value = value[1]
                } else if (isInstanceOf(value, Variant)) {
                    vName = value.variantName
                    value = value.value
                } else {
                    vName = getTypeName(value)
                }
                const vIdx = type.variant.findIndex((t) => t.typeName === vName)
                if (vIdx === -1) {
                    const types = type.variant.map((t) => `'${t.typeName}'`).join(', ')
                    throw new Error(`Unknown variant type '${vName}', expected one of ${types}`)
                }
                const vType = type.variant[vIdx]
                ctx.encoder.writeVaruint32(vIdx)
                ctx.codingPath.push({field: `v${vIdx}`, type: vType})
                encodeAny(value, vType, ctx)
                ctx.codingPath.pop()
            } else {
                if (!abiType) {
                    throw new Error(
                        type.name === 'any' ? 'Unable to encode any type to binary' : 'Unknown type'
                    )
                }
                const instance = abiType.from(value) as ABISerializableObject
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
    codingPath: {field: string | number; type: ABI.ResolvedType}[]
}

export class ABIEncoder {
    static __className = 'ABIEncoder'

    private pos = 0
    private data: DataView
    private array: Uint8Array
    private textEncoder = new TextEncoder()

    /** User declared metadata, can be used to pass info to instances when encoding.  */
    metadata: Record<string, any> = {}

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

    /** Write a single byte. */
    writeByte(byte: number) {
        this.ensure(1)
        this.array[this.pos++] = byte
    }

    /** Write an array of bytes. */
    writeArray(bytes: ArrayLike<number>) {
        const size = bytes.length
        this.ensure(size)
        this.array.set(bytes, this.pos)
        this.pos += size
    }

    writeFloat(value: number, byteWidth: number) {
        this.ensure(byteWidth)
        switch (byteWidth) {
            case 4:
                this.data.setFloat32(this.pos, value, true)
                break
            case 8:
                this.data.setFloat64(this.pos, value, true)
                break
            default:
                throw new Error('Invalid float size')
        }
        this.pos += byteWidth
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

    writeString(v: string) {
        const data = this.textEncoder.encode(v)
        this.writeVaruint32(data.byteLength)
        this.writeArray(data)
    }

    getData(): Uint8Array {
        return new Uint8Array(this.array.buffer, this.array.byteOffset, this.pos)
    }

    getBytes(): Bytes {
        return new Bytes(this.getData())
    }
}
