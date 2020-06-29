import {
    ABISerializableObject,
    ABISerializableType,
    ABIType,
    abiTypeString,
} from '../serializer/serializable'
import {decode, Resolved} from '../serializer/decoder'

export interface VariantConstructor extends ABISerializableType {
    new (...args: any[]): ABISerializableObject
}

export class Variant implements ABISerializableObject {
    static abiName: string
    static abiVariant: ABIType[] = []

    static from<T extends VariantConstructor>(
        this: T,
        object: any,
        variantType?: ABISerializableType<any> | string
    ): InstanceType<T> {
        if (object[Resolved]) {
            return new this(object[1], object[0]) as InstanceType<T>
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
    variantIdx: number

    /** @internal */
    constructor(value: any, variant: number | string) {
        const abiVariant = (this.constructor as VariantConstructor).abiVariant!
        this.value = value
        let variantIdx: number
        if (typeof variant === 'string') {
            variantIdx = abiVariant.map(abiTypeString).findIndex((t) => t === variant)
        } else {
            variantIdx = variant
        }
        if (0 > variantIdx || abiVariant.length <= variant) {
            throw new Error(`Unknown variant ${variant}`)
        }
        this.variantIdx = variantIdx
    }

    get variantName(): string {
        const variant = (this.constructor as VariantConstructor).abiVariant![this.variantIdx]
        return abiTypeString(variant)
    }

    /** @internal */
    toJSON() {
        return [this.variantName, this.value]
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
