import {
    ABISerializable,
    ABISerializableConstructor,
    ABISerializableObject,
    ABISerializableType,
    ABITypeDescriptor,
    abiTypeString,
    toTypeDescriptor,
} from '../serializer/serializable'
import {abiDecode, Resolved} from '../serializer/decoder'
import {abiEncode} from '../serializer/encoder'
import {isInstanceOf} from '../utils'

export interface VariantConstructor extends ABISerializableConstructor {
    new <T extends Variant>(...args: any[]): T
}

export type AnyVariant = Variant | ABISerializable | [string, any]

export class Variant implements ABISerializableObject {
    static abiName = '__variant'
    static abiVariant: ABITypeDescriptor[] = []

    static from<T extends VariantConstructor>(this: T, object: AnyVariant): InstanceType<T>
    static from(object: AnyVariant): unknown
    static from(object: AnyVariant) {
        if (object[Resolved]) {
            return new this(object as [string, ABISerializable])
        }
        if (isInstanceOf(object, this)) {
            return object
        }
        return abiDecode({object, type: this})
    }

    value: ABISerializable
    variantIdx: number

    /** @internal */
    constructor(variant: [string, ABISerializable]) {
        const abiVariant = (this.constructor as VariantConstructor).abiVariant!
        this.value = variant[1]
        const variantIdx = abiVariant.map(abiTypeString).findIndex((t) => t === variant[0])
        if (0 > variantIdx || abiVariant.length <= variantIdx) {
            throw new Error(`Unknown variant ${variant[0]}`)
        }
        this.variantIdx = variantIdx
    }

    /**
     * Return true if this variant equals the other.
     *
     * Note: This compares the ABI encoded bytes of both variants, subclasses
     *       should implement their own fast equality check when possible.
     */
    equals(other: AnyVariant): boolean {
        const self = this.constructor as typeof Variant
        const otherVariant = self.from(other)
        if (this.variantIdx !== otherVariant.variantIdx) {
            return false
        }
        return abiEncode({object: this}).equals(abiEncode({object: otherVariant}))
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
    export function type(name: string, types: ABISerializableType[]) {
        return function <T extends VariantConstructor>(variant: T) {
            variant.abiName = name
            variant.abiVariant = types.map(toTypeDescriptor)
            return variant
        }
    }
}
