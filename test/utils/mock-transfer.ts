import {Action, API, Asset, Name, PrivateKey, SignedTransaction, Struct, Transaction} from '$lib'

@Struct.type('transfer')
class Transfer extends Struct {
    @Struct.field('name') from!: Name
    @Struct.field('name') to!: Name
    @Struct.field('asset') quantity!: Asset
    @Struct.field('string') memo!: string
}

export async function makeMockTransaction(
    info: API.v1.GetInfoResponse,
    memo?: string
): Promise<Transaction> {
    // Assemble transaction header
    const header = info.getTransactionHeader(60)
    // Generate typed data for action data
    const transfer = Transfer.from({
        from: 'corecorecore',
        to: 'teamgreymass',
        quantity: '0.0042 EOS',
        memo: memo || 'eosio-core is the best <3',
    })
    // Assemble action with action data and metadata
    const action = Action.from({
        authorization: [
            {
                actor: 'corecorecore',
                permission: 'active',
            },
        ],
        account: 'eosio.token',
        name: 'transfer',
        data: transfer,
    })
    // Form and return transaction object
    const transaction = Transaction.from({
        ...header,
        actions: [action],
    })
    return transaction
}

export async function signMockTransaction(
    transaction: Transaction,
    info: API.v1.GetInfoResponse
): Promise<SignedTransaction> {
    // Load private key and create signature for transaction
    const privateKey = PrivateKey.from('5JW71y3njNNVf9fiGaufq8Up5XiGk68jZ5tYhKpy69yyU9cr7n9')
    const signature = privateKey.signDigest(transaction.signingDigest(info.chain_id))
    // Form and return signedTransaction object
    const signedTransaction = SignedTransaction.from({
        ...transaction,
        signatures: [signature],
    })
    return signedTransaction
}
