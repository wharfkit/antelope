import {
    ABISerializableObject,
    ABISerializableType,
    ABIType,
    abiTypeString,
} from '../serializer/serializable'
import {decode, Resolved} from '../serializer/decoder'
import {encode} from '../serializer/encoder'

export interface VariantConstructor extends ABISerializableType {
    new (...args: any[]): ABISerializableObject
}

export class Variant implements ABISerializableObject {
    static abiName: string
    static abiVariant: ABIType[] = []

    static from<T extends VariantConstructor>(
        this: T,
        object: any,
        variantType?: ABISerializableType | string
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

    /**
     * Return true if this variant equals the other.
     *
     * Note: This compares the ABI encoded bytes of both variants, subclasses
     *       should implement their own fast equality check when possible.
     */
    equals(other: any) {
        const self = this.constructor as typeof Variant
        const otherVariant = self.from(other)
        if (this.variantIdx !== otherVariant.variantIdx) {
            return false
        }
        return encode({object: this}).equals(encode({object: otherVariant}))
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
    export function type(name: string, types: (ABIType | ABISerializableType | string)[]) {
        return function (variant: typeof Variant) {
            variant.abiName = name
            variant.abiVariant = types.map((type) => {
                if (typeof type === 'string') {
                    return {type}
                }
                if (typeof (type as ABISerializableType).abiName === 'string') {
                    return {type: type as ABISerializableType}
                }
                return type as ABIType
            })
            return variant
        }
    }
}
