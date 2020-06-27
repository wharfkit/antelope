import {Struct, StructConstructor} from './struct'
import {Name, NameType} from './name'
import {Bytes, BytesType} from './bytes'
import {ABISerializable} from '../serializer/serializable'
import {encode} from '../serializer/encoder'

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

interface InternalActionFields {
    account: NameType
    name: NameType
    authorization: PermissionLevelType[]
    data: ABISerializable
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
        object: ActionType | InternalActionFields
    ): InstanceType<T> {
        if (
            !(object.data instanceof Bytes) &&
            (object.data.constructor as any).abiName !== undefined
        ) {
            const data = encode({object: object.data})
            object = {...object, data}
        }
        return super.from(object) as InstanceType<T>
    }
}
