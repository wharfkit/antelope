import {ABI} from '../chain/abi'
import {ABIDecoder} from './decoder'
import {ABIEncoder} from './encoder'

export interface ABISerializable {
    toABI?(encoder: ABIEncoder): void
    toJSON(): any
}

export interface ABIType {
    type: string | ABISerializableType
    optional?: boolean
    array?: boolean
    extension?: boolean
}

export interface ABIField extends ABIType {
    name: string
    default?: any
}

export interface ABISerializableType<T = ABISerializable> {
    abiName: string
    abiFields?: ABIField[]
    abiVariant?: ABIType[]
    abiAlias?: ABIType
    /**
     * Create instance from JavaScript object.
     */
    from(value: any): T
    /**
     * Create instance from binary ABI data.
     * @param decoder Decoder instance to read from.
     */
    fromABI?(decoder: ABIDecoder): T
    /**
     * Static ABI encoding can be used to encode non-class types.
     * Will be used in favor of instance.toABI if both exists.
     * @param value The value to encode.
     * @param encoder The encoder to write the value to.
     */
    toABI?(value: any, encoder: ABIEncoder): void
}

/** Return a ABI definition for given ABISerializableType. */
export function synthesizeABI(type: ABISerializableType) {
    const structs: ABI.Struct[] = []
    const variants: ABI.Variant[] = []
    const aliases: ABI.TypeDef[] = []
    const seen = new Set<ABISerializableType>()
    const resolveAbiType = (t: ABIType) => {
        let typeName: string
        if (typeof t.type !== 'string') {
            typeName = resolve(t.type)
        } else {
            typeName = t.type
        }
        if (t.array === true) {
            typeName += '[]'
        }
        if (t.extension === true) {
            typeName += '$'
        }
        if (t.optional === true) {
            typeName += '?'
        }
        return typeName
    }
    const resolve = (t: ABISerializableType) => {
        if (!t.abiName) {
            throw new Error('Encountered non-conforming type')
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
                base: '',
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
    // resolve the types and assign root as an alias to the first type
    const root: ABI.TypeDef = {
        type: resolve(type),
        new_type_name: 'root',
    }
    aliases.push(root)
    return {abi: ABI.from({structs, variants, types: aliases}), types: Array.from(seen)}
}

export function abiTypeString(type: ABIType) {
    let typeName = typeof type.type === 'string' ? type.type : type.type.abiName
    if (type.array === true) {
        typeName += '[]'
    }
    if (type.extension === true) {
        typeName += '$'
    }
    if (type.optional === true) {
        typeName += '?'
    }
    return typeName
}
