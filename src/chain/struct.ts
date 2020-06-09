import {ABIField, ABISerializable} from '../serializer/serializable'
import {decode, ResolvedStruct} from '../serializer/decoder'

export class Struct implements ABISerializable {
    static abiName: string
    static abiFields: ABIField[]

    static from<T extends typeof Struct>(this: T, object: any): InstanceType<T> {
        if (object[ResolvedStruct] === true) {
            // objects already resolved
            return new this(object) as InstanceType<T>
        }
        if (object instanceof this) {
            return object as InstanceType<T>
        }
        return decode({object, type: this}) as InstanceType<T>
    }

    /** @internal */
    constructor(fields: any) {
        if (fields) {
            for (const key of Object.keys(fields)) {
                this[key] = fields[key]
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
