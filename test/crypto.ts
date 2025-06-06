import {assert} from 'chai'

import {Base58, Bytes, KeyType, PrivateKey, PublicKey} from '$lib'

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
