/** Supported Antelope/EOSIO curve types. */
export enum KeyType {
    K1 = 'K1',
    R1 = 'R1',
    WA = 'WA',
}

export namespace KeyType {
    export function indexFor(value: KeyType) {
        switch (value) {
            case KeyType.K1:
                return 0
            case KeyType.R1:
                return 1
            case KeyType.WA:
                return 2
            default:
                throw new Error(`Unknown curve type: ${value}`)
        }
    }
    export function from(value: number | string) {
        let index: number
        if (typeof value !== 'number') {
            index = KeyType.indexFor(value as KeyType)
        } else {
            index = value
        }
        switch (index) {
            case 0:
                return KeyType.K1
            case 1:
                return KeyType.R1
            case 2:
                return KeyType.WA
            default:
                throw new Error('Unknown curve type')
        }
    }
}
