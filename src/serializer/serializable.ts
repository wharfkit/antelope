import {ABI} from '../chain'
import {ABIDecoder} from './decoder'
import {ABIEncoder} from './encoder'

/** A self-describing object that can be ABI encoded and decoded. */
export type ABISerializable =
    | ABISerializableObject
    | string
    | boolean
    | ABISerializable[]
    | {[key: string]: ABISerializable}

/** Type describing an ABI type, either a string (e.g. `uint32[]`) or a ABI type class. */
export type ABISerializableType = string | ABISerializableConstructor | ABITypeDescriptor

/** Interface that should be implemented by ABI serializable objects. */
export interface ABISerializableObject {
    /** Called when encoding to binary abi format. */
    toABI?(encoder: ABIEncoder): void
    /** Called when encoding to json abi format. */
    toJSON(): any
    /** Return true if the object equals the other object passed. */
    equals(other: any): boolean
}

export interface ABITypeModifiers {
    /** Type is optional, defaults to false. */
    optional?: boolean
    /** Type is an array, defaults to false. */
    array?: boolean
    /** Type is a binary extension, defaults to false. */
    extension?: boolean
}

export interface ABITypeDescriptor extends ABITypeModifiers {
    /** Type name or class. */
    type: ABISerializableConstructor | string
}

export interface ABIField extends ABITypeDescriptor {
    /** Field name. */
    name: string
}

export interface ABISerializableConstructor {
    /** Name of the type, e.g. `asset`. */
    abiName: string
    /** For structs, the fields that this type contains. */
    abiFields?: ABIField[]
    /** For structs, the base class this type extends. */
    abiBase?: ABISerializableConstructor
    /** For variants, the different types this type can represent. */
    abiVariant?: ABITypeDescriptor[]
    /** Alias to another type. */
    abiAlias?: ABITypeDescriptor
    /** Return value to use when creating a new instance of this type, used when decoding binary extensions. */
    abiDefault?: () => ABISerializable
    /**
     * Create new instance from JavaScript object.
     * Should also accept an instance of itself and return that unchanged.
     */
    from(value: any): ABISerializable
    /**
     * Create instance from binary ABI data.
     * @param decoder Decoder instance to read from.
     */
    fromABI?(decoder: ABIDecoder): ABISerializable
    /**
     * Static ABI encoding can be used to encode non-class types.
     * Will be used in favor of instance.toABI if both exists.
     * @param value The value to encode.
     * @param encoder The encoder to write the value to.
     */
    toABI?(value: any, encoder: ABIEncoder): void
    /**
     * Create a new instance, don't use this other than from a custom `from` factory method.
     * @internal
     */
    new (...args: any[]): ABISerializableObject
}

/** Return a ABI definition for given ABISerializableType. */
export function synthesizeABI(type: ABISerializableConstructor) {
    const structs: ABI.Struct[] = []
    const variants: ABI.Variant[] = []
    const aliases: ABI.TypeDef[] = []
    const seen = new Set<ABISerializableConstructor>()
    const resolveAbiType = (t: ABITypeDescriptor) => {
        let typeName: string
        if (typeof t.type !== 'string') {
            typeName = resolve(t.type)
        } else {
            typeName = t.type
        }
        if (t.array === true) {
            typeName += '[]'
        }
        if (t.optional === true) {
            typeName += '?'
        }
        if (t.extension === true) {
            typeName += '$'
        }
        return typeName
    }
    const resolve = (t: ABISerializableConstructor) => {
        if (!t.abiName) {
            throw new Error('Encountered non-conforming type')
        } else if (t.abiName === '__struct') {
            throw new Error('Misconfigured Struct subclass, did you forget @Struct.type?')
        }
        if (seen.has(t)) {
            return t.abiName
        }
        seen.add(t)
        if (t.abiAlias) {
            aliases.push({
                new_type_name: t.abiName,
                type: resolveAbiType(t.abiAlias),
            })
        } else if (t.abiFields) {
            const fields = t.abiFields.map((field) => {
                return {
                    name: field.name,
                    type: resolveAbiType(field),
                }
            })
            const struct: ABI.Struct = {
                base: t.abiBase ? resolve(t.abiBase) : '',
                name: t.abiName,
                fields,
            }
            structs.push(struct)
        } else if (t.abiVariant) {
            const variant: ABI.Variant = {
                name: t.abiName,
                types: t.abiVariant.map(resolveAbiType),
            }
            variants.push(variant)
        }
        return t.abiName
    }
    const root = resolve(type)
    return {abi: ABI.from({structs, variants, types: aliases}), types: Array.from(seen), root}
}

export function abiTypeString(type: ABITypeDescriptor) {
    let typeName = typeof type.type === 'string' ? type.type : type.type.abiName
    if (type.array === true) {
        typeName += '[]'
    }
    if (type.optional === true) {
        typeName += '?'
    }
    if (type.extension === true) {
        typeName += '$'
    }
    return typeName
}

export function isTypeDescriptor(type: ABISerializableType): type is ABITypeDescriptor {
    return (
        typeof type !== 'string' &&
        (type as any).abiName === undefined &&
        (type as any).type !== undefined
    )
}

export function toTypeDescriptor(type: ABISerializableType): ABITypeDescriptor {
    if (typeof type === 'string') {
        return {type}
    }
    if (typeof (type as ABISerializableConstructor).abiName !== 'undefined') {
        return {type: type as ABISerializableConstructor}
    }
    return type as ABITypeDescriptor
}

/** Returns true if the given value conforms to ABISerializableObject. */
export function isABISerializableObject(value: any): value is ABISerializableObject {
    return value && value.constructor && typeof value.constructor.abiName === 'string'
}
