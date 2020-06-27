import {TypeLookup} from './builtins'
import {ABI} from '../chain/abi'

export function resolveAliases(type: ABI.ResolvedType, abiTypes: TypeLookup) {
    let abiType = abiTypes[type.name]
    const seen = new Set<number>()
    while (type.ref) {
        seen.add(type.id)
        type = type.ref
        if (!abiType) {
            abiType = abiTypes[type.name]
        }
        if (seen.has(type.id)) {
            throw new Error('Type has circular reference')
        }
    }
    return {resolved: type, abiType}
}
