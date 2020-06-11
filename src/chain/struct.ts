import {ABIField, ABISerializable, ABISerializableType} from '../serializer/serializable'
import {decode, ResolvedStruct} from '../serializer/decoder'

export class Struct implements ABISerializable {
    static abiName: string
    static abiFields: ABIField[]

    static from<T extends typeof Struct>(this: T, value: any): InstanceType<T> {
        if (value[ResolvedStruct] === true) {
            // objects already resolved
            return new this(value) as InstanceType<T>
        }
        if (value instanceof this) {
            return value as InstanceType<T>
        }
        const object: any = {}
        for (const field of this.abiFields) {
            const v = value[field.name] === undefined ? field.default : value[field.name]
            if (v === undefined && !(field.optional === true || field.name.includes('?'))) {
                throw new Error(`Missing value for non optional field: ${field.name}`)
            }
            object[field.name] = v
        }
        return decode({object, type: this}) as InstanceType<T>
    }

    /** @internal */
    constructor(object: any) {
        if (object) {
            const fields = this.constructor['abiFields'] as ABIField[]
            for (const field of fields) {
                const value = object[field.name] || field.default
                if (value == undefined && !(field.optional === true || field.name.includes('?'))) {
                    throw new Error(`Missing value for non optional field: ${field.name}`)
                }
                this[field.name] = value
            }
        }
    }

    /** @internal */
    toJSON() {
        const fields = this.constructor['abiFields'] as ABIField[]
        const rv: any = {}
        for (const field of fields) {
            rv[field.name] = this[field.name]
        }
        return rv
    }
}

export namespace Struct {
    /* eslint-disable @typescript-eslint/ban-types */
    export function type(name: string) {
        return function <T extends {new (...args: any[]): {}}>(struct: T) {
            struct['abiName'] = name
            return struct
        }
    }
    export function field(type: ABISerializableType | string, options?: Partial<ABIField>) {
        if (!options) options = {}
        return (target: any, name: string) => {
            if (!target.constructor.abiFields) {
                target.constructor.abiFields = []
            }
            target.constructor.abiFields.push({...options, name, type})
        }
    }
}
