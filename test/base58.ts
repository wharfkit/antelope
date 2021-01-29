import * as assert from 'assert'
import 'mocha'

import {Base58, Bytes, BytesType} from '..'

function assertBytes(a: BytesType, b: BytesType) {
    assert.equal(Bytes.from(a).hexString, Bytes.from(b).hexString)
}

suite('base58', function () {
    test('decode', function () {
        assert.ok(Base58.decode('StV1DL6CwTryKyV').equals('68656c6c6f20776f726c64'))
        assert.ok(Base58.decode('StV1DL6CwTryKyV', 11).equals('68656c6c6f20776f726c64'))
        assert.ok(Base58.decode('1111').equals('00000000'))
        assert.throws(() => {
            Base58.decode('000')
        })
        assert.throws(() => {
            Base58.decode('0', 1)
        })
        assert.throws(() => {
            Base58.decode('zzz', 2)
        })
    })

    test('encode', function () {
        assert.equal(Base58.encode(Bytes.from('hello world', 'utf8')), 'StV1DL6CwTryKyV')
        assert.equal(Base58.encode('0000'), '11')
    })

    test('decode check', function () {
        assertBytes(
            Base58.decodeCheck('5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu'),
            '80d25968ebfce6e617bdb839b5a66cfc1fdd051d79a91094f7baceded449f84333'
        )
        assert.throws(() => {
            Base58.decodeCheck('5KQVfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu')
        })
    })

    test('decode ripemd160 check', function () {
        assertBytes(
            Base58.decodeRipemd160Check('6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin'),
            '02caee1a02910b18dfd5d9db0e8a4bc90f8dd34cedbbfb00c6c841a2abb2fa28cc'
        )
        assert.throws(() => {
            Base58.decodeRipemd160Check('6RrVujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin')
        })
        assertBytes(
            Base58.decodeRipemd160Check(
                '6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs',
                33,
                'K1'
            ),
            '02caee1a02910b18dfd5d9db0e8a4bc90f8dd34cedbbfb00c6c841a2abb2fa28cc'
        )
        assertBytes(
            Base58.decodeRipemd160Check(
                '6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs',
                33,
                'K1'
            ),
            '02caee1a02910b18dfd5d9db0e8a4bc90f8dd34cedbbfb00c6c841a2abb2fa28cc'
        )
        assert.throws(() => {
            Base58.decodeRipemd160Check(
                '6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs',
                undefined,
                'ZZ'
            )
        })
    })

    test('encode check', function () {
        assert.equal(
            Base58.encodeCheck(
                '80d25968ebfce6e617bdb839b5a66cfc1fdd051d79a91094f7baceded449f84333'
            ),
            '5KQvfsPJ9YvGuVbLRLXVWPNubed6FWvV8yax6cNSJEzB4co3zFu'
        )
    })

    test('encode ripemd160 check', function () {
        assert.equal(
            Base58.encodeRipemd160Check(
                '02caee1a02910b18dfd5d9db0e8a4bc90f8dd34cedbbfb00c6c841a2abb2fa28cc'
            ),
            '6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeABhJRin'
        )
        assert.equal(
            Base58.encodeRipemd160Check(
                '02caee1a02910b18dfd5d9db0e8a4bc90f8dd34cedbbfb00c6c841a2abb2fa28cc',
                'K1'
            ),
            '6RrvujLQN1x5Tacbep1KAk8zzKpSThAQXBCKYFfGUYeACcSRFs'
        )
    })
})
