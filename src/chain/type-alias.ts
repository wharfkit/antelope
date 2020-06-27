export function TypeAlias(name: string) {
    return function (typeAlias: any) {
        typeAlias.abiAlias = {type: Object.getPrototypeOf(typeAlias.prototype).constructor}
        typeAlias.abiName = name
        return typeAlias
    }
}
