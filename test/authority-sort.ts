import {assert} from 'chai'

import {MockProvider} from './utils/mock-provider'

import {
    Action,
    APIClient,
    APIError,
    Authority,
    Name,
    PrivateKey,
    PublicKey,
    SignedTransaction,
    Struct,
    Transaction,
    UInt16,
    UInt32,
} from '$lib'

const jungle = new APIClient({
    provider: new MockProvider(),
})

@Struct.type('updateauth')
class UpdateAuth extends Struct {
    @Struct.field('name') account!: Name
    @Struct.field('name') permission!: Name
    @Struct.field('name') parent!: Name
    @Struct.field(Authority) auth!: Authority
}

// Chosen so localeCompare order is the reverse of bytewise order: base58 `Z` < `w`.
const KEY_A = PublicKey.from('PUB_K1_5ZexUstSEjwgcZWfziD6zC6xqvDzYkoMH4bf2MjuyJdnejdjWy')
const KEY_B = PublicKey.from('PUB_K1_5wBCjBSLvTm44r6cFBvHVYDcq9syfS7oTh6X8YSPst6msRH7um')

// Passkeys for rpid `jungle4.anchorwallet.io` and `jungle4-account.unicove.com`.
const WA_A = PublicKey.from(
    'PUB_WA_9EgZ4NdyTxraccNd6SHSqfGNdqDGPC2Der6AvnzBJQtTHRgRxf8DZZjf2V4azLnC2YUnWgYDizuLTAWt7bHB'
)
const WA_B = PublicKey.from(
    'PUB_WA_2CSuysB2uR6ewLaqXNxzT2ugL3TqnKUTELtyDB9SiFxnRj3FF4H9KyPmRVBQuwSfejbDe2jGfdqnPta4v3VR3G1maz'
)

// corecorecore@active, the same Jungle 4 account and key the api tests sign with.
const ACCOUNT = 'corecorecore'
const PERMISSION = 'sortproof'
const PRIVATE_KEY = PrivateKey.from('5JW71y3njNNVf9fiGaufq8Up5XiGk68jZ5tYhKpy69yyU9cr7n9')

function authorityWithKeys(keys: PublicKey[]) {
    // Built by hand rather than via Authority.from, which would re-sort the keys.
    const auth = new Authority({
        threshold: UInt32.from(1),
        keys: keys.map((key) => ({key, weight: UInt16.from(1)})) as any,
        accounts: [],
        waits: [],
    })
    return auth
}

async function pushUpdateAuth(auth: Authority, context: string) {
    const provider = jungle.provider as MockProvider
    provider.setContext(context)
    const info = await jungle.v1.chain.get_info()
    const action = Action.from({
        authorization: [{actor: ACCOUNT, permission: 'active'}],
        account: 'eosio',
        name: 'updateauth',
        data: UpdateAuth.from({
            account: ACCOUNT,
            permission: PERMISSION,
            parent: 'active',
            auth,
        }),
    })
    const transaction = Transaction.from({...info.getTransactionHeader(), actions: [action]})
    const signature = PRIVATE_KEY.signDigest(transaction.signingDigest(info.chain_id))
    const signed = SignedTransaction.from({...transaction, signatures: [signature]})
    return jungle.v1.chain.push_transaction(signed)
}

suite('authority key ordering', function () {
    this.slow(500)
    this.timeout(10 * 10000)

    test('nodeos rejects K1 keys in reverse bytewise order', async function () {
        let error: APIError | undefined
        try {
            await pushUpdateAuth(authorityWithKeys([KEY_B, KEY_A]), 'k1-reversed')
        } catch (e) {
            error = e as APIError
        }
        assert.instanceOf(error, APIError, 'expected nodeos to reject the transaction')
        assert.equal(error!.name, 'action_validate_exception')
        assert.match(String(error!.details[0].message), /^Invalid authority/)
    })

    test('Authority.from() orders K1 keys the way nodeos accepts', async function () {
        const auth = Authority.from({
            threshold: 1,
            keys: [
                {key: KEY_B, weight: 1},
                {key: KEY_A, weight: 1},
            ],
        })
        assert.equal(String(auth.keys[0].key), String(KEY_A))
        const result = await pushUpdateAuth(auth, 'k1-sorted')
        assert.isString(result.transaction_id)
    })

    test('nodeos rejects WA keys in reverse bytewise order', async function () {
        let error: APIError | undefined
        try {
            await pushUpdateAuth(authorityWithKeys([WA_B, WA_A]), 'wa-reversed')
        } catch (e) {
            error = e as APIError
        }
        assert.instanceOf(error, APIError, 'expected nodeos to reject the transaction')
        assert.equal(error!.name, 'action_validate_exception')
        assert.match(String(error!.details[0].message), /^Invalid authority/)
    })

    test('Authority.from() orders WA keys the way nodeos accepts', async function () {
        const auth = Authority.from({
            threshold: 1,
            keys: [
                {key: WA_B, weight: 1},
                {key: WA_A, weight: 1},
            ],
        })
        assert.equal(String(auth.keys[0].key), String(WA_A))
        const result = await pushUpdateAuth(auth, 'wa-sorted')
        assert.isString(result.transaction_id)
    })
})
