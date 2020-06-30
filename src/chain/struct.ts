import {ABIField, ABISerializableObject, ABISerializableType} from '../serializer/serializable'
import {decode, Resolved} from '../serializer/decoder'
import {encode} from '../serializer/encoder'

export interface StructConstructor extends ABISerializableType {
    new (...args: any[]): Struct
}

export class Struct implements ABISerializableObject {
    static abiName: string
    static abiFields: ABIField[]

    static from<T extends StructConstructor>(this: T, value: any): InstanceType<T> {
        if (value[Resolved] === true) {
            // objects already resolved
            return new this(value) as InstanceType<T>
        }
        if (value instanceof this) {
            return value as InstanceType<T>
        }
        const object: any = {}
        for (const field of this.abiFields!) {
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
        const self = this.constructor as typeof Struct
        for (const field of self.abiFields) {
            this[field.name] = object[field.name]
        }
    }

    /**
     * Return true if this struct equals the other.
     *
     * Note: This compares the ABI encoded bytes of both structs, subclasses
     *       should implement their own fast equality check when possible.
     */
    equals(other: any) {
        const self = this.constructor as typeof Struct
        if (
            other.constructor &&
            typeof other.constructor.abiName === 'string' &&
            other.constructor.abiName !== self.abiName
        ) {
            return false
        }
        return encode({object: this}).equals(encode({object: self.from(other)}))
    }

    /** @internal */
    toJSON() {
        const self = this.constructor as typeof Struct
        const rv: any = {}
        for (const field of self.abiFields) {
            rv[field.name] = this[field.name]
        }
        return rv
    }
}

export namespace Struct {
    const FieldsOwner = Symbol('FieldsOwner')
    /* eslint-disable @typescript-eslint/ban-types */
    export function type(name: string) {
        return function <T extends {new (...args: any[]): {}}>(struct: T) {
            // eslint-disable-next-line @typescript-eslint/no-extra-semi
            ;(struct as any).abiName = name
            return struct
        }
    }
    export function field(type: ABISerializableType | string, options?: Partial<ABIField>) {
        if (!options) options = {}
        return (target: any, name: string) => {
            if (!target.constructor.abiFields) {
                target.constructor.abiFields = []
                target.constructor.abiFields[FieldsOwner] = target
            } else if (target.constructor.abiFields[FieldsOwner] !== target) {
                // if the target class isn't the owner we take a copy before
                // adding fields as to not modify the parent class
                target.constructor.abiFields = target.constructor.abiFields.slice(0)
                target.constructor.abiFields[FieldsOwner] = target
            }
            target.constructor.abiFields.push({...options, name, type})
        }
    }
}
