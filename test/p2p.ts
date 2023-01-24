import {assert} from 'chai'
import {P2P, P2PClient, P2PClientOptions, PackedTransaction, Serializer} from '$lib'
import {MockP2PProvider} from './utils/mock-p2p-provider'
import {readFileSync} from 'fs'

suite('p2p', function () {
    const makeMockClient = (
        additionalOpts?: Partial<P2PClientOptions>
    ): [P2PClient, MockP2PProvider] => {
        const mockProvider = new MockP2PProvider()
        const client = new P2PClient({...additionalOpts, provider: mockProvider})

        client.on('error', (e) => {
            console.dir(e)
            assert.fail(e)
        })

        return [client, mockProvider]
    }

    const testMessages: Array<{message: P2P.NetMessage['value']; data: Buffer}> = [
        {
            message: P2P.HandshakeMessage.from({
                networkVersion: 0xfe,
                chainId: '01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01',
                nodeId: '02ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02',
                key: 'PUB_K1_5AHoNnWetuDhKWSDx3WUf8W7Dg5xjHCMc4yHmmSiaJCFvvAgnB',
                time: 1,
                token: '03ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff03',
                sig: 'SIG_K1_KfPLgpw35iX8nfDzhbcmSBCr7nEGNEYXgmmempQspDJYBCKuAEs5rm3s4ZuLJY428Ca8ZhvR2Dkwu118y3NAoMDxhicRj9',
                p2pAddress: 'foo',
                lastIrreversibleBlockNumber: 2,
                lastIrreversibleBlockId:
                    '04ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff04',
                headNum: 3,
                headId: '05ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff05',
                os: 'bar',
                agent: 'baz',
                generation: 4,
            }),
            data: Buffer.from(
                'fe0001ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0102ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02000223e0ae8aacb41b06dc74af1a56b2eb69133f07f7f75bd1d5e53316bff195edf4010000000000000003ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0300205150a67288c3b393fdba9061b05019c54b12bdac295fc83bebad7cd63c7bb67d5cb8cc220564da006240a58419f64d06a5c6e1fc62889816a6c3dfdd231ed38903666f6f0200000004ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff040300000005ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff05036261720362617a0400',
                'hex'
            ),
        },
        {
            message: P2P.ChainSizeMessage.from({
                lastIrreversibleBlockNumber: 2,
                lastIrreversibleBlockId:
                    '04ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff04',
                headNum: 3,
                headId: '05ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff05',
            }),
            data: Buffer.from(
                '0200000004ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff040300000005ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff05',
                'hex'
            ),
        },
        {
            message: P2P.GoAwayMessage.from({
                reason: 9,
                nodeId: '01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01',
            }),
            data: Buffer.from(
                '0901ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01',
                'hex'
            ),
        },
        {
            message: P2P.TimeMessage.from({
                org: 1,
                rec: 2,
                xmt: 3,
                dst: 4,
            }),
            data: Buffer.from(
                '0100000000000000020000000000000003000000000000000400000000000000',
                'hex'
            ),
        },
        {
            message: P2P.NoticeMessage.from({
                knownTrx: ['01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01'],
                knownBlocks: ['02ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02'],
            }),
            data: Buffer.from(
                '0101ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff010102ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02',
                'hex'
            ),
        },
        {
            message: P2P.RequestMessage.from({
                reqTrx: ['01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01'],
                reqBlocks: ['02ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02'],
            }),
            data: Buffer.from(
                '0101ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff010102ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02',
                'hex'
            ),
        },
        {
            message: P2P.SyncRequestMessage.from({
                startBlock: 6,
                endBlock: 1024,
            }),
            data: Buffer.from('0600000000040000', 'hex'),
        },
        {
            message: P2P.SignedBlock.from(
                JSON.parse(
                    readFileSync(
                        'test/data/000000075fbe6bbad86e424962a190e8309394b7bff4bf3e16b0a2a71e5a617c.json'
                    ).toString()
                )
            ),
            data: readFileSync(
                'test/data/000000075fbe6bbad86e424962a190e8309394b7bff4bf3e16b0a2a71e5a617c.bin'
            ),
        },
        {
            message: PackedTransaction.from({
                compression: 0,
                packed_context_free_data: '',
                packed_trx:
                    '408c395b796efe6596160000000001a09861f648958566000000000080694a01a0986af74a94be6400000000a8ed32321e1d766f74652067753274656d6271676167652c207765206c6f766520424d00',
                signatures: [
                    'SIG_K1_KfPLgpw35iX8nfDzhbcmSBCr7nEGNEYXgmmempQspDJYBCKuAEs5rm3s4ZuLJY428Ca8ZhvR2Dkwu118y3NAoMDxhicRj9',
                ],
            }),
            data: Buffer.from(
                '0100205150a67288c3b393fdba9061b05019c54b12bdac295fc83bebad7cd63c7bb67d5cb8cc220564da006240a58419f64d06a5c6e1fc62889816a6c3dfdd231ed389000050408c395b796efe6596160000000001a09861f648958566000000000080694a01a0986af74a94be6400000000a8ed32321e1d766f74652067753274656d6271676167652c207765206c6f766520424d00',
                'hex'
            ),
        },
    ]

    for (const {message, data} of testMessages) {
        const vmessage = P2P.NetMessage.from(message)
        const vdata = Buffer.allocUnsafe(data.length + 1)
        vdata.writeUint8(vmessage.variantIdx, 0)
        vdata.set(data, 1)
        test(`receive ${vmessage.variantName}`, async function () {
            const [client, mockProvider] = makeMockClient()

            let called = false
            client.on('message', (message) => {
                assert.deepEqual(
                    JSON.parse(JSON.stringify(message)),
                    JSON.parse(JSON.stringify(vmessage))
                )
                called = true
            })

            mockProvider.emit('data', [vdata])
            assert.equal(called, true)
        })

        test(`send ${vmessage.variantName}`, async function () {
            const [client, mockProvider] = makeMockClient()

            let sentData = undefined as undefined | Buffer
            mockProvider.send = (data: Buffer) => {
                sentData = data
            }

            client.send(message)

            assert.notEqual(sentData, undefined)
            assert.equal(sentData!.toString('hex'), vdata.toString('hex'))
        })
    }

    test('heartbeat trigger', async function () {
        let setTimeoutCalled = false
        let fireTimeout = () => {}
        const setTimeoutMock: P2PClientOptions['setTimeoutImpl'] = (
            handler: any,
            timeout?: number | undefined,
            ...args: any[]
        ) => {
            assert.equal(timeout, 6789)
            setTimeoutCalled = true
            fireTimeout = () => {
                handler(...args)
            }

            return 0
        }

        const [_, mockProvider] = makeMockClient({
            setTimeoutImpl: setTimeoutMock,
            heartbeatTimoutMs: 6789,
        })

        assert.equal(setTimeoutCalled, true)

        let sentData = undefined as undefined | Buffer
        mockProvider.send = (data: Buffer) => {
            sentData = data
        }

        fireTimeout()
        assert.notEqual(sentData, undefined)
        const message = Serializer.decode({type: P2P.NetMessage, data: sentData})
        assert.equal(message.variantName, 'time_message')
    })
})
