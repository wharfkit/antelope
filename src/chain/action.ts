import {abiEncode} from '../serializer/encoder'
import {abiDecode} from '../serializer/decoder'
import {
    ABISerializable,
    ABISerializableConstructor,
    ABISerializableObject,
    ABISerializableType,
    synthesizeABI,
} from '../serializer/serializable'

import {arrayEquatableEquals} from '../utils'
import {BuiltinTypes, getType} from '../serializer/builtins'

import {
    ABI,
    ABIDef,
    Bytes,
    BytesType,
    Name,
    NameType,
    PermissionLevel,
    PermissionLevelType,
    Struct,
} from '../'

interface ActionBase {
    /** The account (a.k.a. contract) to run action on. */
    account: NameType
    /** The name of the action. */
    name: NameType
    /** The permissions authorizing the action. */
    authorization: PermissionLevelType[]
}

export interface ActionFields extends ActionBase {
    /** The ABI-encoded action data. */
    data: BytesType
}

/** Action type that may or may not have its data encoded */
export interface AnyAction extends ActionBase {
    data: BytesType | ABISerializableObject | Record<string, any>
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

    public abi?: ABI

    static from(anyAction: ActionType | AnyAction, abi?: ABIDef): Action {
        let object = {...anyAction}
        const data = object.data as any
        if (!Bytes.isBytes(data)) {
            let type: string | undefined
            if (abi) {
                type = ABI.from(abi).getActionType(object.name)
            } else if (!data.constructor || data.constructor.abiName === undefined) {
                throw new Error(
                    'Missing ABI definition when creating action with untyped action data'
                )
            }
            object = {
                ...object,
                data: abiEncode({object: data, type, abi}),
            }
        }

        const action = super.from(object) as Action
        if (abi) {
            action.abi = ABI.from(abi)
        } else {
            const type = getType(data)
            if (type) {
                action.abi = ABI.from({
                    ...synthesizeABI(type).abi,
                    actions: [
                        {
                            name: action.name,
                            type: type.abiName,
                            ricardian_contract: '',
                        },
                    ],
                })
            }
        }

        return action
    }

    /** Return true if this Action is equal to given action. */
    equals(other: ActionType | AnyAction) {
        const otherAction = Action.from(other, this.abi)
        return (
            this.account.equals(otherAction.account) &&
            this.name.equals(otherAction.name) &&
            arrayEquatableEquals(this.authorization, otherAction.authorization) &&
            this.data.equals(otherAction.data)
        )
    }

    /** Return action data decoded as given type or using ABI. */
    decodeData<T extends ABISerializableConstructor>(type: T): InstanceType<T>
    decodeData<T extends keyof BuiltinTypes>(type: T): BuiltinTypes[T]
    decodeData(abi: ABIDef): ABISerializable
    decodeData(typeOrAbi: ABISerializableType | ABIDef) {
        if (typeof typeOrAbi === 'string' || (typeOrAbi as ABISerializableConstructor).abiName) {
            return abiDecode({
                data: this.data,
                type: typeOrAbi as string,
            })
        } else {
            const abi = ABI.from(typeOrAbi as ABIDef)
            const type = abi.getActionType(this.name)
            if (!type) {
                throw new Error(`Action ${this.name} does not exist in provided ABI`)
            }
            return abiDecode({data: this.data, type, abi})
        }
    }

    get decoded() {
        if (!this.abi) {
            throw new Error('Missing ABI definition when decoding action data')
        }
        return {
            ...this.toJSON(),
            data: this.decodeData(this.abi),
        }
    }
}
