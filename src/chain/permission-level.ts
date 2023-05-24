import {Name, NameType, Struct} from '../'

export type PermissionLevelType = PermissionLevel | {actor: NameType; permission: NameType}

/** Antelope/EOSIO Permission Level, a.k.a "auth". */
@Struct.type('permission_level')
export class PermissionLevel extends Struct {
    @Struct.field('name') actor!: Name
    @Struct.field('name') permission!: Name

    /** Create new permission level from representing types. Can be expressed as a string in the format `<actor>@<permission>`. */
    static from(value: PermissionLevelType | string): PermissionLevel {
        if (typeof value === 'string') {
            const parts = value.split('@')
            if (parts.length !== 2 && parts[0].length > 0 && parts[1].length > 0) {
                throw new Error(
                    'Invalid permission level string, should be in the format <actor>@<permission>'
                )
            }
            value = {actor: parts[0], permission: parts[1]}
        }
        return super.from(value) as PermissionLevel
    }

    /** Return true if this permission level equals other. */
    equals(other: PermissionLevelType | string) {
        const otherPerm = PermissionLevel.from(other)
        return this.actor.equals(otherPerm.actor) && this.permission.equals(otherPerm.permission)
    }

    toString() {
        return `${this.actor}@${this.permission}`
    }
}
