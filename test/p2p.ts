import {assert} from 'chai'
import {
    Bytes,
    P2P,
    P2PClient,
    P2PClientOptions,
    P2PProvider,
    PackedTransaction,
    Serializer,
    SimpleEnvelopeP2PProvider,
} from '$lib'
import {MockP2PProvider} from './utils/mock-p2p-provider'

suite('p2p', function () {
    const makeMockClient = (
        enveloped: boolean,
        additionalOpts?: Partial<P2PClientOptions>
    ): [P2PClient, MockP2PProvider] => {
        const mockProvider = new MockP2PProvider()
        let useProvider: P2PProvider = mockProvider
        if (enveloped) {
            useProvider = new SimpleEnvelopeP2PProvider(mockProvider)
        }
        const client = new P2PClient({...additionalOpts, provider: useProvider})

        client.on('error', (e) => {
            console.dir(e)
            assert.fail(e)
        })

        return [client, mockProvider]
    }

    const testMessages: Array<{message: P2P.NetMessage['value']; data: Bytes}> = [
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
            data: Bytes.from(
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
            data: Bytes.from(
                '0200000004ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff040300000005ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff05',
                'hex'
            ),
        },
        {
            message: P2P.GoAwayMessage.from({
                reason: 9,
                nodeId: '01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01',
            }),
            data: Bytes.from(
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
            data: Bytes.from(
                '0100000000000000020000000000000003000000000000000400000000000000',
                'hex'
            ),
        },
        {
            message: P2P.NoticeMessage.from({
                knownTrx: ['01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01'],
                knownBlocks: ['02ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02'],
            }),
            data: Bytes.from(
                '0101ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff010102ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02',
                'hex'
            ),
        },
        {
            message: P2P.RequestMessage.from({
                reqTrx: ['01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff01'],
                reqBlocks: ['02ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02'],
            }),
            data: Bytes.from(
                '0101ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff010102ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02',
                'hex'
            ),
        },
        {
            message: P2P.SyncRequestMessage.from({
                startBlock: 6,
                endBlock: 1024,
            }),
            data: Bytes.from('0600000000040000', 'hex'),
        },
        {
            message: P2P.SignedBlock.from({
                timeSlot: 1163721185,
                producer: 'eosio',
                confirmed: 0,
                previous: '00000006cdcc27dd5599c2bf11d6086315f7f3e20dab443b28b7a3a7b3e9b498',
                transaction_mroot:
                    '0000000000000000000000000000000000000000000000000000000000000000',
                action_mroot: 'c92b7fe28da371253c0764688c82cd4c3755c88580e5f3587243f3a98934554e',
                schedule_version: 0,
                producer_signature:
                    'SIG_K1_K4p4AW5xFwKbxRRUQjGMVfS1x5vSfbaLHMiCQpPgRESfQ6S3iXbcdzBYrhqup3sLgF1qNWGNP5Jio1uS2iKoPquUvifw8G',
                transactions: [],
                header_extensions: [],
                block_extensions: [],
            }),
            data: Bytes.from(
                'e1f95c450000000000ea3055000000000006cdcc27dd5599c2bf11d6086315f7f3e20dab443b28b7a3a7b3e9b4980000000000000000000000000000000000000000000000000000000000000000c92b7fe28da371253c0764688c82cd4c3755c88580e5f3587243f3a98934554e000000000000001f490bd9651e56b29585221deb072e4f13b3cd201e7167cd48952b872070d71b380596305b55bbd2c1029f3f29b7534ed56447cc7b4d07e5a52890a8d32c449e0c0000',
                'hex'
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
            data: Bytes.from(
                '0100205150a67288c3b393fdba9061b05019c54b12bdac295fc83bebad7cd63c7bb67d5cb8cc220564da006240a58419f64d06a5c6e1fc62889816a6c3dfdd231ed389000050408c395b796efe6596160000000001a09861f648958566000000000080694a01a0986af74a94be6400000000a8ed32321e1d766f74652067753274656d6271676167652c207765206c6f766520424d00',
                'hex'
            ),
        },
    ]

    for (const {message, data} of testMessages) {
        const vmessage = P2P.NetMessage.from(message)
        const vdata = new Uint8Array(data.length + 1)
        const vdataView = new DataView(vdata.buffer)
        vdataView.setUint8(0, vmessage.variantIdx)
        vdata.set(data.array, 1)

        const socketData = new Uint8Array(vdata.length + 4)
        const socketDataView = new DataView(socketData.buffer)
        socketDataView.setUint32(0, vdata.length, true)
        socketData.set(vdata, 4)
        test(`receive ${vmessage.variantName}`, async function () {
            const [client, mockProvider] = makeMockClient(false)

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

        test(`receive socket ${vmessage.variantName}`, async function () {
            const [client, mockProvider] = makeMockClient(true)

            let called = false
            client.on('message', (message) => {
                assert.deepEqual(
                    JSON.parse(JSON.stringify(message)),
                    JSON.parse(JSON.stringify(vmessage))
                )
                called = true
            })

            const pivot = Math.floor(socketData.byteLength / 2)
            mockProvider.emit('data', [socketData.slice(0, pivot)])
            assert.equal(called, false)
            mockProvider.emit('data', [socketData.slice(pivot)])
            assert.equal(called, true)
        })

        test(`send ${vmessage.variantName}`, async function () {
            const [client, mockProvider] = makeMockClient(false)

            let sentData = undefined as undefined | Uint8Array
            mockProvider.write = (data: Uint8Array) => {
                sentData = data
            }

            client.send(message)

            assert.notEqual(sentData, undefined)
            assert.equal(sentData!.toString(), vdata.toString())
        })

        test(`send socket ${vmessage.variantName}`, async function () {
            const [client, mockProvider] = makeMockClient(true)

            let sentData = undefined as undefined | Uint8Array
            mockProvider.write = (data: Uint8Array) => {
                sentData = data
            }

            client.send(message)

            assert.notEqual(sentData, undefined)
            assert.equal(sentData!.toString(), socketData.toString())
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

        const [_, mockProvider] = makeMockClient(false, {
            setTimeoutImpl: setTimeoutMock,
            heartbeatTimoutMs: 6789,
        })

        assert.equal(setTimeoutCalled, true)

        let sentData = undefined as undefined | Uint8Array
        mockProvider.write = (data: Uint8Array) => {
            sentData = data
        }

        fireTimeout()
        assert.notEqual(sentData, undefined)
        const message = Serializer.decode({type: P2P.NetMessage, data: sentData})
        assert.equal(message.variantName, 'time_message')
    })
})
