import {Struct, StructConstructor} from './struct'
import {Name, NameType} from './name'
import {Bytes, BytesType} from './bytes'
import {encode} from '../serializer/encoder'
import {ABI, ABIDef} from './abi'
import {decode} from '../serializer/decoder'
import {
    ABISerializable,
    ABISerializableObject,
    ABISerializableType,
} from '../serializer/serializable'
import {PermissionLevel, PermissionLevelType} from './permission-level'
import {arrayEquatableEquals} from '../utils'

export interface ActionFields {
    /** The account (a.k.a. contract) to run action on. */
    account: NameType
    /** The name of the action. */
    name: NameType
    /** The permissions authorizing the action. */
    authorization: PermissionLevelType[]
    /** The ABI-encoded action data. */
    data: BytesType
}

/** Action type that may or may not have its data encoded */
export interface AnyAction {
    account: NameType
    name: NameType
    authorization: PermissionLevelType[]
    data: BytesType | ABISerializable
}

export type ActionType = Action | ActionFields

@Struct.type('action')
export class Action extends Struct {
    /** The account (a.k.a. contract) to run action on. */
    @Struct.field('name') account!: Name
    /** The name of the action. */
    @Struct.field('name') name!: Name
    /** The permissions authorizing the action. */
    @Struct.field(PermissionLevel, {array: true}) authorization!: PermissionLevel[]
    /** The ABI-encoded action data. */
    @Struct.field('bytes') data!: Bytes

    static from<T extends StructConstructor>(
        this: T,
        object: ActionType | AnyAction,
        abi?: ABIDef
    ): InstanceType<T> {
        const data = object.data as any
        if (!(data instanceof Bytes) && (data.constructor.abiName || abi)) {
            let type: string | undefined
            if (abi) {
                type = ABI.from(abi).getActionType(object.name)
            }
            object = {
                ...object,
                data: encode({object: data, type, abi}),
            }
        }
        return super.from(object) as InstanceType<T>
    }

    /** Return true if this Action is equal to given action. */
    equals(other: ActionType | AnyAction) {
        const otherAction = Action.from(other)
        return (
            this.account.equals(otherAction.account) &&
            this.name.equals(otherAction.name) &&
            arrayEquatableEquals(this.authorization, otherAction.authorization) &&
            this.data.equals(otherAction.data)
        )
    }

    /** Return action data decoded as given type. */
    decodeData<T extends ABISerializableObject>(type: string | ABISerializableType, abi?: ABIDef) {
        return decode<T>({data: this.data, type: type, abi})
    }
}
