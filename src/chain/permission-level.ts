import {Name, NameType} from './name'
import {Struct} from './struct'

export type PermissionLevelType = PermissionLevel | {actor: NameType; permission: NameType}

@Struct.type('permission_level')
export class PermissionLevel extends Struct {
    @Struct.field('name') actor!: Name
    @Struct.field('name') permission!: Name
}
