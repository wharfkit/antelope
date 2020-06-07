import {ABIEncoder} from './encoder'
import {ABI} from '../chain/abi'

export interface ABISerializable {
    toABI?(encoder: ABIEncoder): void
    toJSON(): any
}

export interface ABIField {
    name: string
    type: string | ABISerializableType
    optional?: boolean
    array?: boolean
    extension?: boolean
}

export interface ABISerializableType<T = ABISerializable> {
    abiName: string
    abiFields?: ABIField[]
    /**
     * Create instance from JavaScript object.
     */
    from(value: any): T
    /**
     * Create instance from binary ABI data.
     * @param decoder Decoder instance to read from.
     */
    fromABI(decoder: any): T
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
    const seen = new Set<string>()
    const resolve = (t: ABISerializableType) => {
        if (!t.abiName) {
            throw new Error('Encountered non-conforming type')
        }
        if (seen.has(t.abiName)) {
            return t.abiName
        }
        seen.add(t.abiName)
        if (t.abiFields) {
            const fields = t.abiFields.map((field) => {
                let fieldType: string
                if (typeof field.type !== 'string') {
                    fieldType = resolve(field.type)
                } else {
                    fieldType = field.type
                }
                if (field.array === true) {
                    fieldType += '[]'
                }
                if (field.extension === true) {
                    fieldType += '$'
                }
                if (field.optional === true) {
                    fieldType += '?'
                }
                return {name: field.name, type: fieldType}
            })
            const struct: ABI.Struct = {
                base: '',
                name: t.abiName,
                fields,
            }
            structs.push(struct)
        }
        return t.abiName
    }
    // resolve the types and assign root as an alias to the first type
    const root: ABI.TypeDef = {
        type: resolve(type),
        newTypeName: 'root',
    }
    return ABI.from({structs, types: [root]})
}
