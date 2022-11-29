import {
    ABIField,
    ABISerializableConstructor,
    ABISerializableObject,
    ABITypeModifiers,
} from '../serializer/serializable'
import {abiDecode, Resolved} from '../serializer/decoder'
import {abiEncode} from '../serializer/encoder'
import {isInstanceOf} from '../utils'

export interface StructConstructor extends ABISerializableConstructor {
    new <T extends Struct>(...args: any[]): T
    structFields: ABIField[]
}

export class Struct implements ABISerializableObject {
    static abiName = '__struct'
    static abiFields: ABIField[]
    static abiBase: ABISerializableConstructor

    static from<T extends StructConstructor>(this: T, value: any): InstanceType<T>
    static from(value: any): unknown
    static from(value: any) {
        if (value[Resolved] === true) {
            // objects already resolved
            return new this(value)
        }
        if (isInstanceOf(value, this)) {
            return value
        }
        return abiDecode({object: value, type: this})
    }

    static get structFields() {
        const rv: ABIField[] = []
        const walk = (t: ABISerializableConstructor) => {
            if (t.abiBase) {
                walk(t.abiBase)
            }
            for (const field of t.abiFields || []) {
                rv.push(field)
            }
        }
        walk(this)
        return rv
    }

    /** @internal */
    constructor(object: any) {
        const self = this.constructor as typeof Struct
        for (const field of self.structFields) {
            this[field.name] = object[field.name]
        }
    }

    /**
     * Return true if this struct equals the other.
     *
     * Note: This compares the ABI encoded bytes of both structs, subclasses
     *       should implement their own fast equality check when possible.
     */
    equals(other: any): boolean {
        const self = this.constructor as typeof Struct
        if (
            other.constructor &&
            typeof other.constructor.abiName === 'string' &&
            other.constructor.abiName !== self.abiName
        ) {
            return false
        }
        return abiEncode({object: this}).equals(abiEncode({object: self.from(other) as any}))
    }

    /** @internal */
    toJSON() {
        const self = this.constructor as typeof Struct
        const rv: any = {}
        for (const field of self.structFields) {
            rv[field.name] = this[field.name]
        }
        return rv
    }
}

export namespace Struct {
    const FieldsOwner = Symbol('FieldsOwner')
    export function type(name: string) {
        return function <T extends StructConstructor>(struct: T) {
            struct.abiName = name
            return struct
        }
    }
    export function field(
        type: ABISerializableConstructor | string,
        options: ABITypeModifiers = {}
    ) {
        return <T extends Struct>(target: T, name: string) => {
            const ctor = target.constructor as StructConstructor
            if (!ctor.abiFields) {
                ctor.abiFields = []
                ctor.abiFields[FieldsOwner] = ctor
            } else if (ctor.abiFields[FieldsOwner] !== ctor) {
                // if the target class isn't the owner we set the base and start new fields
                ctor.abiBase = ctor.abiFields[FieldsOwner]
                ctor.abiFields = []
                ctor.abiFields[FieldsOwner] = ctor
            }
            ctor.abiFields.push({...options, name, type})
        }
    }
}
