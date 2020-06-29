import {Struct, StructConstructor} from './struct'
import {Name, NameType} from './name'
import {Bytes, BytesType} from './bytes'
import {encode} from '../serializer/encoder'
import {ABI, ABIDef} from './abi'
import {decode} from '../serializer/decoder'
import {ABISerializableObject, ABISerializableType} from '../serializer/serializable'
import {PermissionLevel, PermissionLevelType} from './permission-level'

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
    data: any
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
        object: ActionType | InternalActionFields,
        abi?: ABIDef
    ): InstanceType<T> {
        if (
            !(object.data instanceof Bytes) &&
            (object.data.constructor.abiName !== undefined || abi)
        ) {
            let type: string | undefined
            if (abi) {
                type = ABI.from(abi).getActionType(object.name)
            }
            const data = encode({object: object.data, type, abi})
            object = {...object, data}
        }
        return super.from(object) as InstanceType<T>
    }

    /** Return action data decoded as given type. */
    decodeData<T extends ABISerializableObject>(
        type: string | ABISerializableType<any>,
        abi?: ABIDef
    ) {
        return decode<T>({data: this.data, type: type, abi})
    }
}
