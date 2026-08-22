import {assert} from 'chai'

import {Base58, Bytes, KeyType, PackedTransaction, PrivateKey, PublicKey, Signature} from '$lib'

suite('crypto', function () {
    this.slow(200)

    test('private key encoding', function () {
        const key = PrivateKey.from('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        assert.equal(key.type, 'K1')
        assert.equal(key.toWif(), '5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        assert.equal(key.toString(), 'PVT_K1_2be6BwD56MHeVD4P95bRLdnP3oB3P4QRAXAsSKh4N8Xu6d4Aux')
        assert.equal(
            key.data.hexString,
            'd25968ebfce6e617bdb839b5a66cfc1fdd051d79a91094f7baceded449f84333'
        )
        const r1Key = PrivateKey.from('PVT_R1_2dSFGZnA4oFvMHwfjeYCtK2MLLPNYWgYRXrPTcnTaLZFkDSELm')
        assert.equal(r1Key.toString(), 'PVT_R1_2dSFGZnA4oFvMHwfjeYCtK2MLLPNYWgYRXrPTcnTaLZFkDSELm')
        assert.throws(() => {
            r1Key.toWif()
        })
    })

    test('public key encoding', function () {
        const key = PublicKey.from('PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs')
        assert.equal(key.type, 'K1')
        assert.equal(key.toString(), 'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs')
        assert.equal(key.toLegacyString(), 'EOS6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin')
        assert.equal(
            PublicKey.from('EOS6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin').toString(),
            'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs'
        )
        assert.equal(
            key.data.hexString,
            '02caee1a02910b18dfd5d9db0e8a4bc90f8dd34cedbbfb00c6c841a2abb2fa28cc'
        )
        const r1Key = PublicKey.from('PUB_R1_8E46r5HiQF84o6V8MWQQg1vPpgfjYA4XDqT6xbtaaebxw7XbLu')
        assert.equal(r1Key.toString(), 'PUB_R1_8E46r5HiQF84o6V8MWQQg1vPpgfjYA4XDqT6xbtaaebxw7XbLu')
        assert.throws(() => {
            r1Key.toLegacyString()
        })
    })

    test('public key prefix', function () {
        const privKey = PrivateKey.from('5J4zo6Af9QnAeJmNEQeAR4MNhaG7SKVReAYgZC8655hpkbbBscr')
        const pubKey = privKey.toPublic()
        assert.equal(pubKey.toString(), 'PUB_K1_87DUhBcZrLhyFfBVDyu1iWZJUGURqbk6CQxwv5g6iWUD2X45Hv')
        assert.equal(
            pubKey.toLegacyString(),
            'EOS87DUhBcZrLhyFfBVDyu1iWZJUGURqbk6CQxwv5g6iWUCy9dCUJ'
        )
        assert.equal(
            pubKey.toLegacyString('FIO'),
            'FIO87DUhBcZrLhyFfBVDyu1iWZJUGURqbk6CQxwv5g6iWUCy9dCUJ'
        )
    })

    test('public from private', function () {
        const privKey = PrivateKey.from('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        const pubKey = privKey.toPublic()
        assert.equal(pubKey.toString(), 'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs')
        const r1PrivKey = PrivateKey.from(
            'PVT_R1_2dSFGZnA4oFvMHwfjeYCtK2MLLPNYWgYRXrPTcnTaLZFkDSELm'
        )
        const r1PubKey = r1PrivKey.toPublic()
        assert.equal(
            r1PubKey.toString(),
            'PUB_R1_8E46r5HiQF84o6V8MWQQg1vPpgfjYA4XDqT6xbtaaebxw7XbLu'
        )
    })

    test('sign and verify', function () {
        const privKey = PrivateKey.from('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        const pubKey = PublicKey.from('PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs')
        const message = Bytes.from('I like turtles', 'utf8')
        const signature = privKey.signMessage(message)
        assert.equal(signature.verifyMessage(message, pubKey), true)
        assert.equal(signature.verifyMessage('beef', pubKey), false)
        assert.equal(
            signature.verifyMessage(
                message,
                PublicKey.from('EOS7HBX4f8UknP5NNoX8ixCx4YrA8JcPhGbuQ7Xem8gmWg1nviTqR')
            ),
            false
        )
        // r1
        const privKey2 = PrivateKey.from(
            'PVT_R1_2dSFGZnA4oFvMHwfjeYCtK2MLLPNYWgYRXrPTcnTaLZFkDSELm'
        )
        const pubKey2 = PublicKey.from('PUB_R1_8E46r5HiQF84o6V8MWQQg1vPpgfjYA4XDqT6xbtaaebxw7XbLu')
        const signature2 = privKey2.signMessage(message)
        assert.equal(signature2.verifyMessage(message, pubKey2), true)
    })

    test('sign and recover', function () {
        const key = PrivateKey.from('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        const message = Bytes.from('I like turtles', 'utf8')
        const signature = key.signMessage(message)
        const recoveredKey = signature.recoverMessage(message)
        assert.equal(
            recoveredKey.toString(),
            'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs'
        )
        assert.equal(
            recoveredKey.toLegacyString(),
            'EOS6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin'
        )
        assert.equal(
            recoveredKey.toLegacyString('FIO'),
            'FIO6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin'
        )
        assert.notEqual(
            signature.recoverMessage('beef').toString(),
            'PUB_K1_6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs'
        )
        const r1Key = PrivateKey.from('PVT_R1_2dSFGZnA4oFvMHwfjeYCtK2MLLPNYWgYRXrPTcnTaLZFkDSELm')
        const r1Signature = r1Key.signMessage(message)
        assert.equal(
            r1Signature.recoverMessage(message).toString(),
            'PUB_R1_8E46r5HiQF84o6V8MWQQg1vPpgfjYA4XDqT6xbtaaebxw7XbLu'
        )
    })

    test('shared secrets', function () {
        const priv1 = PrivateKey.from('5KGNiwTYdDWVBc9RCC28hsi7tqHGUsikn9Gs8Yii93fXbkYzxGi')
        const priv2 = PrivateKey.from('5Kik3tbLSn24ScHFsj6GwLkgd1H4Wecxkzt1VX7PBBRDQUCdGFa')
        const pub1 = PublicKey.from('PUB_K1_7Wp9pzhtTfN3jSyQDCktKLqxdTAcAfgT2RrVpE6KThZraa381H')
        const pub2 = PublicKey.from('PUB_K1_6P8aGPEP79815rKGQ1dbc9eDxoEjatX7Lp696ve5tinnfwJ6nt')
        const expected =
            'def2d32f6b849198d71118ef53dbc3b679fe2b2c174ee4242a33e1a3f34c46fc' +
            'baa698fb599ca0e36f555dde2ac913a10563de2c33572155487cd8b34523de9e'
        assert.equal(priv1.sharedSecret(pub2), expected)
        assert.equal(priv2.sharedSecret(pub1), expected)
    })

    test('key generation', function () {
        assert.doesNotThrow(() => {
            PrivateKey.generate('R1')
        })
        assert.doesNotThrow(() => {
            PrivateKey.generate('K1')
        })
        assert.throws(() => {
            PrivateKey.generate('XX')
        })
    })

    test('key errors', function () {
        try {
            PrivateKey.from('PVT_K1_2be6BwD56MHeVD4P95bRLdnP3oB3P4QRAXAsSKh4N8Xu6d4Auz')
            assert.fail()
        } catch (error) {
            assert.ok(error instanceof Base58.DecodingError)
            assert.equal(error.code, Base58.ErrorCode.E_CHECKSUM)
            assert.equal(error.info.hash, 'ripemd160')
            assert.deepEqual(Array.from(error.info.actual), [236, 129, 232, 27])
            assert.deepEqual(Array.from(error.info.expected), [236, 129, 232, 29])
        }
        const key1 = PrivateKey.fromString(
            'PVT_K1_2be6BwD56MHeVD4P95bRLdnP3oB3P4QRAXAsSKh4N8Xu6d4Auz',
            true
        )
        assert.equal(key1.toString(), 'PVT_K1_2be6BwD56MHeVD4P95bRLdnP3oB3P4QRAXAsSKh4N8Xu6d4Aux')
        try {
            PrivateKey.from('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zxx')
            assert.fail()
        } catch (error) {
            assert.ok(error instanceof Base58.DecodingError)
            assert.equal(error.code, Base58.ErrorCode.E_CHECKSUM)
            assert.equal(error.info.hash, 'double_sha256')
        }
        const key2 = PrivateKey.fromString(
            '5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zxx',
            true
        )
        assert.equal(key2.toWif(), '5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        assert.doesNotThrow(() => {
            PrivateKey.fromString('PVT_K1_ApBgGcJ2HeGR3szXA9JJptGCWUbSwewtGsxm3DVr86pJtb5V', true)
        })
        assert.throws(() => {
            PrivateKey.fromString('PVT_K1_ApBgGcJ2HeGR3szXA9JJptGCWUbSwewtGsxm3DVr86pJtb5V')
        }, /Checksum mismatch/)
    })

    test('key generation', function () {
        assert.doesNotThrow(() => {
            const k = PrivateKey.generate('K1')
            PrivateKey.fromString(String(k))
        })
        assert.throws(() => {
            new PrivateKey(KeyType.K1, Bytes.random(31))
        })
        assert.throws(() => {
            const k = PrivateKey.generate('K1')
            k.data = Bytes.random(31)
            PrivateKey.fromString(String(k))
        })
    })

    test('invalid private key (zero key)', function () {
        const zeroBytes = new Uint8Array(32) // all zero
        // PVT_K1_111111111111111111111111111111112omJse
        let keyStr = 'PVT_K1_' + Base58.encodeRipemd160Check(zeroBytes, 'K1')
        try {
            PrivateKey.from(keyStr)
            assert.fail()
        } catch (error) {
            assert.ok(error instanceof Error, 'Error should be an instance of Error')
            assert.ok(
                error.message.includes('All-zero private key is not allowed'),
                'Error message should indicate all-zero private key'
            )
        }
        //PVT_R1_111111111111111111111111111111117FF8iA
        keyStr = 'PVT_R1_' + Base58.encodeRipemd160Check(zeroBytes, 'R1');
        try {
            PrivateKey.from(keyStr)
            assert.fail()
        } catch (error) {
            assert.ok(error instanceof Error, 'Error should be an instance of Error')
            assert.ok(
                error.message.includes('All-zero private key is not allowed'),
                'Error message should indicate all-zero private key'
            )
        }
    })
})

suite('crypto compatibility', function () {
    // fixtures generated with @wharfkit/antelope@1.2.0 (elliptic/hash.js based)
    this.slow(200)

    test('K1 signatures are byte-identical to elliptic', function () {
        const key = PrivateKey.from('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        const fixtures: [string, string][] = [
            [
                'I like turtles',
                'SIG_K1_KYzSWVRXhNJtNZa5pwuFqoMi1J12n2hVsQv4bKxxFSSUa2MiGNCFuBP1wARST7wWDTCSJx19ey9cvpGKwX3MxKzhcfVNb2',
            ],
            [
                'wharfkit noble migration',
                'SIG_K1_KVniJXMm6RpGhM1VX4KUTXUKxqCTq9SR1bnhdtof4yeue59LgweDDCmsXofyLgFPsWUec2mFedoSqfbiLYGEgbQaQthp5r',
            ],
            [
                'canonical grind coverage message 7',
                'SIG_K1_JxWfuSY8YfQYZoecLtna5WKscKqGNCTJeVqS2nC8HnNNTEQxPmi2WihaNNSJdyC5uFjy3YwcRTa11nuCY1zEMW2vnets9Z',
            ],
        ]
        for (const [message, expected] of fixtures) {
            const signature = key.signMessage(Bytes.from(message, 'utf8'))
            assert.equal(signature.toString(), expected)
        }
    })

    test('R1 signatures are byte-identical to elliptic', function () {
        const key = PrivateKey.from('PVT_R1_2dSFGZnA4oFvMHwfjeYCtK2MLLPNYWgYRXrPTcnTaLZFkDSELm')
        const signature = key.signMessage(Bytes.from('I like turtles', 'utf8'))
        assert.equal(
            signature.toString(),
            'SIG_R1_K7srmMxTnxb1YLHeGBhQM3WTVfFLYfxXk1V1ydnFMpcCCqN7pX342C6e4Kc93TSQANsdy9TaVypJYEAevwe1gECsWiG9FU'
        )
    })

    test('K1 signatures satisfy the nodeos canonical rule', function () {
        // mirrors fc public_key::is_canonical (elliptic_common.cpp)
        const key = PrivateKey.from('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        for (let i = 0; i < 100; i++) {
            const sig = key.signMessage(Bytes.from(`canonical check ${i}`, 'utf8'))
            const data = sig.data.array
            const r = data.subarray(1, 33)
            const s = data.subarray(33, 65)
            assert.isTrue(
                !(r[0] & 0x80) &&
                    !(r[0] === 0 && !(r[1] & 0x80)) &&
                    !(s[0] & 0x80) &&
                    !(s[0] === 0 && !(s[1] & 0x80)),
                `non-canonical signature produced for message ${i}`
            )
        }
    })

    test('shared secret pads x-coordinate to 32 bytes like nodeos', function () {
        // this pair's ECDH x-coordinate has a leading zero byte that pre-2.0 elliptic trimmed
        const priv1 = PrivateKey.from('5Hs2Yr8f52hmHJR7KNEGU4aWDCuDtYAYh3esS86vJXdL2DkpwSb')
        const priv2 = PrivateKey.from('5KLzNkY4tY26K7D4VgwFjfTJa952RGa7NTShU3tCrJYo1DYsrNC')
        const expected =
            'ad8c7ad06b81e21a8144c71b69155b133e88eb1792f26ff8a58a81b82971cfe9' +
            '59edd45735d8fccd52faf93076e6c5c31391a03cda3cf4bb230aaccd66d1d346'
        assert.equal(String(priv1.sharedSecret(priv2.toPublic())), expected)
        assert.equal(String(priv2.sharedSecret(priv1.toPublic())), expected)
        // legacy option reproduces the trimmed derivation from @wharfkit/antelope 1.x
        const legacyExpected =
            '99eb0ac62800f5666db72b626dd450a72065bae9b3f5a4e3a19cbbe0126f40a0' +
            '1a7fe90b06be2b6873a7ca14bdbf8c8edb6f56a72b77117476865390b3fe088b'
        assert.equal(String(priv1.sharedSecret(priv2.toPublic(), {legacy: true})), legacyExpected)
        assert.equal(String(priv2.sharedSecret(priv1.toPublic(), {legacy: true})), legacyExpected)
        // both derivations agree when the x-coordinate has no leading zero byte
        const priv3 = PrivateKey.from('5KGNiwTYdDWVBc9RCC28hsi7tqHGUsikn9Gs8Yii93fXbkYzxGi')
        const priv4 = PrivateKey.from('5Kik3tbLSn24ScHFsj6GwLkgd1H4Wecxkzt1VX7PBBRDQUCdGFa')
        assert.equal(
            String(priv3.sharedSecret(priv4.toPublic(), {legacy: true})),
            String(priv3.sharedSecret(priv4.toPublic()))
        )
    })

    test('R1 shared secret matches both derivations', function () {
        // R1 pair whose ECDH x-coordinate has a leading zero byte, values from 1.2.0
        const priv1 = PrivateKey.from('PVT_R1_HGxaJ87n8ewfqpZt9ouaKgp7s6yJ5HjwoCivhdgsEw4YGPthJ')
        const priv2 = PrivateKey.from('PVT_R1_25DQc22Spo72hJ6PcHuYYVx9umy2ndhPyRh2iZVSgekjvacdu5')
        const padded =
            '90d1b2ebb43dd23561edb085ccb3c3bb9c9899b172e82673766f84c76d148f6b' +
            '02a9b9c22c2ff2e3daf547e2dfe994d2fbaf903cd4349be8407272ffa749d8bf'
        const legacy =
            'da604bc9f7ba018d870881d43d163e0ab9df1327fd97441707bdfa159a77fd68' +
            '48dbe9a25ac7606b0de11eabba26cb04c159fb88617e9c391357046d71c86877'
        assert.equal(String(priv1.sharedSecret(priv2.toPublic())), padded)
        assert.equal(String(priv2.sharedSecret(priv1.toPublic())), padded)
        assert.equal(String(priv1.sharedSecret(priv2.toPublic(), {legacy: true})), legacy)
        assert.equal(String(priv2.sharedSecret(priv1.toPublic(), {legacy: true})), legacy)
    })

    test('rejects private keys outside the curve order', function () {
        // elliptic silently reduced these mod n and signed as a different key
        const overOrder = new PrivateKey(
            KeyType.K1,
            Bytes.from('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 'hex')
        )
        assert.throws(() => {
            overOrder.toPublic()
        })
        assert.throws(() => {
            overOrder.signMessage(Bytes.from('should not sign', 'utf8'))
        })
    })

    test('sign and recover round-trips across generated keys', function () {
        for (const type of ['K1', 'R1'] as const) {
            for (let i = 0; i < 10; i++) {
                const key = PrivateKey.generate(type)
                const message = Bytes.from(`recover round trip ${type} ${i}`, 'utf8')
                const signature = key.signMessage(message)
                assert.equal(
                    signature.recoverMessage(message).toString(),
                    key.toPublic().toString(),
                    `recovery mismatch for generated ${type} key ${i}`
                )
                assert.isTrue(signature.verifyMessage(message, key.toPublic()))
            }
        }
    })

    test('verify accepts high-S signatures like elliptic did', function () {
        const key = PrivateKey.from('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        const message = Bytes.from('high-S acceptance', 'utf8')
        const signature = key.signMessage(message)
        const data = signature.data.array.slice()
        // s' = n - s produces the equally-valid non-canonical twin of the signature
        const n = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141')
        let s = 0n
        for (let i = 33; i < 65; i++) s = (s << 8n) | BigInt(data[i])
        let highS = n - s
        for (let i = 64; i >= 33; i--) {
            data[i] = Number(highS & 0xffn)
            highS >>= 8n
        }
        const mutated = Signature.from({
            type: 'K1',
            r: data.subarray(1, 33),
            s: data.subarray(33, 65),
            recid: (data[0] - 31) ^ 1,
        })
        assert.isTrue(mutated.verifyMessage(message, key.toPublic()))
    })

    test('inflates zlib data produced by pako 2', function () {
        // PackedTransaction serialized by @wharfkit/antelope@1.2.0 with zlib compression
        const packed = PackedTransaction.from({
            signatures: [],
            compression: 1,
            packed_context_free_data: '789c630000000100',
            packed_trx:
                '789c63d8199a696960c4c9c800028c0ccb9a4c985f198402d9e1ba3667cf322ed0737d15b4' +
                '44cf1524bbe2ad91914ec3c68971b16abda70416795aac5cddb34b401dac9381c5d53f1844' +
                '7367a4e6e4e42b94e717e5a4300000b6b21a22',
        })
        const transaction = packed.getTransaction()
        assert.equal(
            String(transaction.id),
            '91c9a6cab9df9b6bf7630513d2bc2d3ce6eadd29fc57b84fabb788b31c3bd8af'
        )
    })
})
