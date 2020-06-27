import {ABISerializable, ABISerializableType, ABIType} from '../serializer/serializable'
import {decode, Resolved} from '../serializer/decoder'
import {getTypeName} from '../serializer/builtins'

export interface VariantConstructor extends ABISerializableType {
    new (...args: any[]): ABISerializable
}

export class Variant implements ABISerializable {
    static abiName: string
    static abiVariant: ABIType[] = []

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
    export function type(name: string, types: (ABIType | ABISerializableType<any> | string)[]) {
        return function (variant: any) {
            variant.abiName = name
            variant.abiVariant = types.map((t) => {
                if (typeof t === 'string' || typeof (t as any).abiName === 'string') {
                    return {type: t}
                } else {
                    return t
                }
            }) as ABIType[]
            return variant
        }
    }
}
