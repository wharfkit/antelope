import {ABIField, ABISerializable, ABISerializableType} from '../serializer/serializable'
import {decode, Resolved} from '../serializer/decoder'
import {getType, getTypeName} from '../serializer/builtins'
import {ABIEncoder} from '../serializer/encoder'

export interface VariantConstructor extends ABISerializableType {
    new (...args: any[]): ABISerializable
}

export class Variant implements ABISerializable {
    static abiName: string
    static abiVariant: (ABISerializableType<any> | string)[] = []

    static from<T extends VariantConstructor>(
        this: T,
        object: any,
        variantType?: ABISerializableType<any> | string
    ): InstanceType<T> {
        if (object[Resolved]) {
            return new this(object[1]) as InstanceType<T>
        }
        if (object instanceof this) {
            return object as InstanceType<T>
        }
        // for special cases like string[] where we can't determine the type reliably
        if (variantType) {
            object = [typeof variantType === 'string' ? variantType : variantType.abiName, object]
        }
        return decode({object, type: this}) as InstanceType<T>
    }

    value: any

    /** @internal */
    constructor(value: any) {
        this.value = value
    }

    /** @internal */
    toJSON() {
        const value = (this as any).value
        return [getTypeName(value), value]
    }
}

export namespace Variant {
    export function type(name: string, types: (ABISerializableType<any> | string)[]) {
        return function (variant: any) {
            variant.abiName = name
            variant.abiVariant = types
            return variant
        }
    }
}
