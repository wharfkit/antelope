import {PermissionLevel, PublicKey, PublicKeyType, Struct, TypeAlias, UInt16, UInt32} from '../'

@TypeAlias('weight_type')
export class Weight extends UInt16 {}

@Struct.type('key_weight')
export class KeyWeight extends Struct {
    @Struct.field(PublicKey) key!: PublicKey
    @Struct.field(Weight) weight!: Weight
}

@Struct.type('permission_level_weight')
export class PermissionLevelWeight extends Struct {
    @Struct.field(PermissionLevel) permission!: PermissionLevel
    @Struct.field(Weight) weight!: Weight
}

@Struct.type('wait_weight')
export class WaitWeight extends Struct {
    @Struct.field(UInt32) wait_sec!: UInt32
    @Struct.field(Weight) weight!: Weight
}

@Struct.type('authority')
export class Authority extends Struct {
    @Struct.field(UInt32) threshold!: UInt32
    @Struct.field(KeyWeight, {array: true}) keys!: KeyWeight[]
    @Struct.field(PermissionLevelWeight, {array: true}) accounts!: PermissionLevelWeight[]
    @Struct.field(WaitWeight, {array: true}) waits!: WaitWeight[]

    /** Total weight of all waits. */
    get waitThreshold(): number {
        return this.waits.reduce((val, wait) => val + wait.weight.toNumber(), 0)
    }

    /** Weight a key needs to sign for this authority. */
    get keyTreshhold(): number {
        return this.threshold.toNumber() - this.waitThreshold
    }

    /** Return the weight for given public key, or zero if it is not included in this authority. */
    keyWeight(publicKey: PublicKeyType): number {
        const weight = this.keys.find(({key}) => key.equals(publicKey))
        return weight ? weight.weight.toNumber() : 0
    }

    /**
     * Check if given public key has permission in this authority,
     * @attention Does not take indirect permissions for the key via account weights into account.
     * @param publicKey The key to check.
     * @param includePartial Whether to consider auths where the key is included but can't be reached alone (e.g. multisig).
     */
    hasPermission(publicKey: PublicKeyType, includePartial = false): boolean {
        const threshold = includePartial ? 1 : this.keyTreshhold
        const weight = this.keyWeight(publicKey)
        return weight >= threshold
    }

    /**
     * Sorts the authority weights in place, should be called before including the authority in a `updateauth` action or it might be rejected.
     */
    sort() {
        // This hack satisfies the constraints that authority weights, see: https://github.com/greymass/eosio-core/issues/8
        this.keys.sort((a, b) => String(a.key).localeCompare(String(b.key)))
        this.accounts.sort((a, b) => String(a.permission).localeCompare(String(b.permission)))
        this.waits.sort((a, b) => String(a.wait_sec).localeCompare(String(b.wait_sec)))
    }
}
