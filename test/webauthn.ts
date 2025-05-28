import {assert} from 'chai'
import ecPackage from 'elliptic'
const {ec: EC} = ecPackage

import {ABIEncoder, Bytes, Checksum256, KeyType, PrivateKey, PublicKey, Signature} from '$lib'

suite('WebAuthn (WA) Key Support', function () {
    this.slow(300)

    const p256 = new EC('p256')
    const testKeyPair = p256.genKeyPair()
    const testPubPoint = testKeyPair.getPublic()
    const testCompressedPubKeyHex = testPubPoint.encodeCompressed('hex')
    const testCompressedPubKeyBytes = Bytes.from(testCompressedPubKeyHex, 'hex').array

    const userPresenceByte = 0x01
    const hostname = 'example.com'
    const hostnameBytes = Bytes.from(hostname, 'utf8').array

    const waPublicKeyData = new Uint8Array(33 + 1 + hostnameBytes.length)
    waPublicKeyData.set(testCompressedPubKeyBytes, 0)
    waPublicKeyData.set(new Uint8Array([userPresenceByte]), 33)
    waPublicKeyData.set(hostnameBytes, 34)
    const waPublicKeyBytes = new Bytes(waPublicKeyData)

    const waPublicKey = new PublicKey(KeyType.WA, waPublicKeyBytes)
    const waPublicKeyString = waPublicKey.toString()

    const messageToSign = Bytes.from('test message for WA keys', 'utf8')
    const messageDigest = Checksum256.hash(messageToSign)
    const sigFromElliptic = testKeyPair.sign(messageDigest.array, {canonical: true})

    const rBytes = Bytes.from(sigFromElliptic.r.toArray('be', 32)).array
    const sBytes = Bytes.from(sigFromElliptic.s.toArray('be', 32)).array
    const recid = sigFromElliptic.recoveryParam!

    const mockAuthData = Bytes.from(
        'mockAuthenticatorData012345678901234567890123456789',
        'utf8'
    ).array
    const mockClientDataJSON = Bytes.from(
        '{"type":"webauthn.get","challenge":"...","origin":"https://example.com"}',
        'utf8'
    ).array

    const waSignatureDataEncoder = new ABIEncoder()
    waSignatureDataEncoder.writeByte(recid + 31)
    waSignatureDataEncoder.writeArray(rBytes)
    waSignatureDataEncoder.writeArray(sBytes)
    waSignatureDataEncoder.writeArray(mockAuthData) // Simulating Bytes.toABI
    waSignatureDataEncoder.writeArray(mockClientDataJSON) // Simulating Bytes.toABI
    const waSignatureBytes = waSignatureDataEncoder.getBytes()
    const waSignature = new Signature(KeyType.WA, waSignatureBytes)

    test('WA PublicKey encoding', function () {
        assert.equal(waPublicKey.type, KeyType.WA, 'PublicKey type should be WA')
        assert.isTrue(waPublicKeyString.startsWith('PUB_WA_'), 'String format incorrect')

        const parsedWAPublicKey = PublicKey.from(waPublicKeyString)
        assert.equal(parsedWAPublicKey.type, KeyType.WA, 'Parsed PublicKey type should be WA')
        assert.isTrue(
            parsedWAPublicKey.data.equals(waPublicKeyBytes),
            'Parsed PublicKey data mismatch'
        )
        assert.equal(
            parsedWAPublicKey.toString(),
            waPublicKeyString,
            'Parsed PublicKey toString mismatch'
        )

        const compressedBytes = waPublicKey.getCompressedKeyBytes()
        assert.equal(compressedBytes.byteLength, 33, 'Compressed key bytes length')
        assert.deepEqual(
            compressedBytes,
            testCompressedPubKeyBytes,
            'Compressed key bytes content mismatch'
        )

        assert.throws(
            () => {
                waPublicKey.toLegacyString()
            },
            /Unable to create legacy formatted string for non-K1 key/i,
            'WA key toLegacyString should throw'
        )
    })

    test('WA Signature encoding', function () {
        assert.equal(waSignature.type, KeyType.WA, 'Signature type should be WA')
        const sigString = waSignature.toString()
        assert.isTrue(sigString.startsWith('SIG_WA_'), 'Signature string format incorrect')

        const parsedWASignature = Signature.from(sigString)
        assert.equal(parsedWASignature.type, KeyType.WA, 'Parsed Signature type should be WA')
        assert.isTrue(
            parsedWASignature.data.equals(waSignatureBytes),
            'Parsed Signature data mismatch'
        )
    })

    test('WA sign and verify', function () {
        assert.isTrue(
            waSignature.verifyDigest(messageDigest, waPublicKey),
            'WA signature should verify with correct digest and public key'
        )

        const wrongMessageDigest = Checksum256.hash(Bytes.from('wrong message', 'utf8'))
        assert.isFalse(
            waSignature.verifyDigest(wrongMessageDigest, waPublicKey),
            'WA signature should not verify with incorrect digest'
        )

        const anotherKeyPair = p256.genKeyPair()
        const differentCompressedPubKeyHex = anotherKeyPair.getPublic().encodeCompressed('hex')
        const differentCompressedPubKeyBytes = Bytes.from(differentCompressedPubKeyHex, 'hex').array

        const differentWAPublicKeyData = new Uint8Array(33 + 1 + hostnameBytes.length)
        differentWAPublicKeyData.set(differentCompressedPubKeyBytes, 0)
        differentWAPublicKeyData.set(new Uint8Array([userPresenceByte]), 33)
        differentWAPublicKeyData.set(hostnameBytes, 34)
        const differentWAPublicKey = new PublicKey(KeyType.WA, new Bytes(differentWAPublicKeyData))

        assert.isFalse(
            waSignature.verifyDigest(messageDigest, differentWAPublicKey),
            'WA signature should not verify with incorrect public key'
        )
    })

    test('WA sign and recover', function () {
        assert.throws(
            () => {
                waSignature.recoverDigest(messageDigest)
            },
            /can't recover webauthn public keys/i,
            'WA key recovery should throw'
        )
    })

    test('PrivateKey generation for WA', function () {
        const waPrivKey = PrivateKey.generate(KeyType.WA)
        assert.equal(waPrivKey.type, KeyType.WA, 'Generated WA private key should have type WA')
        const waPubKeyFromGen = waPrivKey.toPublic()
        assert.equal(
            waPubKeyFromGen.type,
            KeyType.WA,
            'Public key from generated WA private key should have type WA'
        )
    })
})
