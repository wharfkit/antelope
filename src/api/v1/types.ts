import {Asset} from '../../chain/asset'
import {Int32, Int64, UInt32, UInt64} from '../../chain/integer'
import {Name} from '../../chain/name'
import {PermissionLevel} from '../../chain/permission-level'
import {PublicKey} from '../../chain/public-key'
import {Struct} from '../../chain/struct'
import {TimePoint} from '../../chain/time'

@Struct.type('account_auth')
export class AccountAuth extends Struct {
    @Struct.field('uint32') weight!: UInt32
    @Struct.field(PermissionLevel) permission!: PermissionLevel
}

@Struct.type('key_auth')
export class KeyAuth extends Struct {
    @Struct.field('uint32') weight!: UInt32
    @Struct.field('public_key') key!: PublicKey
}

@Struct.type('required_auth')
export class RequiredAuth extends Struct {
    @Struct.field('uint32') threshold!: UInt32
    @Struct.field(KeyAuth, {array: true, default: []}) keys!: KeyAuth[]
    @Struct.field(AccountAuth, {array: true, default: []}) accounts!: AccountAuth[]
}

@Struct.type('account_permission')
export class AccountPermission extends Struct {
    @Struct.field('name') perm_name!: Name
    @Struct.field('name') parent!: Name
    @Struct.field(RequiredAuth) required_auth!: RequiredAuth
}

@Struct.type('account_resource_limit')
export class AccountResourceLimit extends Struct {
    @Struct.field('int32') used!: Int32
    @Struct.field('int32') available!: Int32
    @Struct.field('int32') max!: Int32
}

@Struct.type('account_total_resources')
export class AccountTotalResources extends Struct {
    @Struct.field('name') owner!: Name
    @Struct.field('asset') net_weight!: Asset
    @Struct.field('asset') cpu_weight!: Asset
    @Struct.field('uint64') ram_bytes!: UInt64
}

@Struct.type('account_self_delegated_bandwidth')
export class AccountSelfDelegatedBandwidth extends Struct {
    @Struct.field('name') from!: Name
    @Struct.field('name') to!: Name
    @Struct.field('asset') net_weight!: Asset
    @Struct.field('asset') cpu_weight!: Asset
}

@Struct.type('account_refund_request')
export class AccountRefundRequest extends Struct {
    @Struct.field('name') owner!: Name
    @Struct.field('time_point') request_time!: TimePoint
    @Struct.field('asset') net_amount!: Asset
    @Struct.field('asset') cpu_amount!: Asset
}

@Struct.type('account_voter_info')
export class AccountVoterInfo extends Struct {
    @Struct.field('name') owner!: Name
    @Struct.field('name') proxy!: Name
    @Struct.field('name', {array: true}) producers!: Name[]
    @Struct.field('int64') staked!: Int64
    // @Struct.field('float64') last_vote_weight!: Float64
    // @Struct.field('float64') proxied_vote_weight!: Float64
    @Struct.field('bool') is_proxy!: boolean
    @Struct.field('uint32') flags1!: UInt32
    @Struct.field('uint32') reserved2!: UInt32
    @Struct.field('string') reserved3!: string
}

@Struct.type('account_rex_info_maturities')
export class AccountRexInfoMaturities extends Struct {
    @Struct.field('time_point') key!: TimePoint
    @Struct.field('int64') value!: Int64
}

@Struct.type('account_rex_info')
export class AccountRexInfo extends Struct {
    @Struct.field('uint32') version!: UInt32
    @Struct.field('name') owner!: Name
    @Struct.field('asset') vote_stake!: Asset
    @Struct.field('asset') rex_balance!: Asset
    @Struct.field('int64') matured_rex!: Int64
    @Struct.field(AccountRexInfoMaturities, {array: true})
    rex_maturities!: AccountRexInfoMaturities[]
}
