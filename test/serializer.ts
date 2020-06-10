import * as assert from 'assert'
import 'mocha'

import {Serializer} from '../src/serializer'

import {Name} from '../src/chain/name'
import {ABI} from '../src/chain/abi'
import {UInt256, UInt64} from '../src/chain/integer'
import {Asset} from '../src/chain/asset'
import {PublicKey} from '../src/chain/public-key'
import {Signature} from '../src/chain/signature'
import {Struct} from '../src/chain/struct'

suite('serializer', function () {
    test('array', function () {
        const data = '0303666f6f036261720362617a'
        const array = ['foo', 'bar', 'baz']
        assert.equal(Serializer.encode({object: array, type: 'string[]'}).hexString, data)
        assert.deepEqual(Serializer.decode({data, type: 'string[]'}), array)
        assert.throws(() => {
            Serializer.encode({object: 'banana', type: 'string[]'})
        })
        assert.throws(() => {
            Serializer.decode({object: 'banana', type: 'string[]'})
        })
    })

    test('name', function () {
        const data = '000000005c73285d'
        const object = Name.from('foobar')
        const json = '"foobar"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.deepEqual(Serializer.decode({data, type: Name}), object)
        assert.deepEqual(Serializer.decode({json, type: 'name'}), object)
        assert.deepEqual(Name.from(UInt64.from('6712742083569909760')), object)
        assert.equal(JSON.stringify(object), json)
        assert.equal(object.value.toString(), '6712742083569909760')
    })

    test('asset', function () {
        const data = '393000000000000004464f4f00000000'
        const object = Asset.from('1.2345 FOO')
        const json = '"1.2345 FOO"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: Asset})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'asset'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('asset symbol', function () {
        const data = '04464f4f00000000'
        const object = Asset.Symbol.from('4,FOO')
        const json = '"4,FOO"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: Asset.Symbol})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'symbol'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('struct', function () {
        const abi = ABI.from({
            structs: [
                {
                    base: '',
                    name: 'foo',
                    fields: [
                        {name: 'one', type: 'string'},
                        {name: 'two', type: 'int8'},
                    ],
                },
                {
                    base: 'foo',
                    name: 'bar',
                    fields: [
                        {name: 'three', type: 'name?'},
                        {name: 'four', type: 'string[]?'},
                    ],
                },
            ],
        })
        const object = {
            one: 'one',
            two: 2,
            three: 'two',
            four: ['f', 'o', 'u', 'r'],
        }
        const enc = Serializer.encode({object, abi, type: 'bar'})
        assert.equal(enc.hexString, '036f6e65020100000000000028cf01040166016f01750172')
        const dec = Serializer.decode({data: enc, type: 'bar', abi})
        assert.equal(
            JSON.stringify(dec),
            '{"one":"one","two":2,"three":"two","four":["f","o","u","r"]}'
        )
    })

    test('struct object', function () {
        class Other extends Struct {
            static abiName = 'other'
            static abiFields = [{name: 'doeet', type: 'bool'}]
            doeet!: boolean
        }
        class Test extends Struct {
            static abiName = 'test'
            static abiFields = [
                {name: 'foo', type: Name},
                {name: 'things', type: 'string[]'},
                {name: 'keys', type: PublicKey, optional: true, array: true},
                {name: 'other', type: Other},
            ]
            foo!: Name
            things!: string[]
            keys?: PublicKey[]
            other!: Other
        }
        const object = Test.from({foo: 'bar', things: ['a', 'b', 'c'], other: {doeet: true}})
        const encoded = Serializer.encode({object})
        assert.equal(encoded.hexString, '000000000000ae39030161016201630001')
        const decoded = Serializer.decode({data: encoded, type: Test})
        assert.equal(
            JSON.stringify(decoded),
            '{"foo":"bar","things":["a","b","c"],"keys":null,"other":{"doeet":true}}'
        )
    })

    test('struct decorators', function () {
        @Struct.type('transfer')
        class Transfer extends Struct {
            @Struct.field('name') from!: Name
            @Struct.field('name') to!: Name
            @Struct.field('asset') quantity!: Asset
            @Struct.field('string') memo!: string
        }

        const transfer = Transfer.from({
            from: 'alice',
            to: 'bob',
            quantity: '3.5 GMZ',
            memo: 'for you',
        })

        transfer.quantity.value += 38.5

        assert.equal(
            Serializer.encode({object: transfer}).hexString,
            '0000000000855c340000000000000e3da40100000000000001474d5a0000000007666f7220796f75'
        )

        assert.equal(
            JSON.stringify(transfer),
            '{"from":"alice","to":"bob","quantity":"42.0 GMZ","memo":"for you"}'
        )

        assert.equal(
            JSON.stringify(Serializer.synthesize(Transfer)),
            '{"version":"eosio::abi/1.1","types":[{"type":"transfer","newTypeName":"root"}],"variants":[],' +
                '"structs":[{"base":"","name":"transfer","fields":[{"name":"from","type":"name"},{"name":"' +
                'to","type":"name"},{"name":"quantity","type":"asset"},{"name":"memo","type":"string"}]}],' +
                '"actions":[],"tables":[],"ricardian_clauses":[]}'
        )
    })

    test('untyped struct', function () {
        const object = {
            name: Name.from('foobar'),
            string: 'hello',
            flag: false,
            nest: {
                grains: UInt256.from('75000000000000000000000'),
            },
        }
        assert.equal(
            Serializer.encode({object}).hexString,
            '000000005c73285d0568656c6c6f000000e038f8e815c2e10f00000000000000000000000000000000000000000000'
        )
        assert.throws(() => {
            Serializer.encode({
                object: {
                    numbers: 123,
                },
            })
        })
    })

    test('string', function () {
        const data = '0b68656c6c6f20776f726c64'
        const object = 'hello world'
        const json = '"hello world"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: 'string'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('bool', function () {
        const data = '01'
        const object = true
        const json = 'true'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: 'bool'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('public key', function () {
        const data = '000223e0ae8aacb41b06dc74af1a56b2eb69133f07f7f75bd1d5e53316bff195edf4'
        const object = PublicKey.from('PUB_K1_5AHoNnWetuDhKWSDx3WUf8W7Dg5xjHCMc4yHmmSiaJCFvvAgnB')
        const json = '"PUB_K1_5AHoNnWetuDhKWSDx3WUf8W7Dg5xjHCMc4yHmmSiaJCFvvAgnB"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: PublicKey})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'public_key'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('signature', function () {
        const data =
            '00205150a67288c3b393fdba9061b05019c54b12bdac295fc83bebad7cd63c7bb67d5cb8cc220564da006240a58419f64d06a5c6e1fc62889816a6c3dfdd231ed389'
        const object = Signature.from(
            'SIG_K1_KfPLgpw35iX8nfDzhbcmSBCr7nEGNEYXgmmempQspDJYBCKuAEs5rm3s4ZuLJY428Ca8ZhvR2Dkwu118y3NAoMDxhicRj9'
        )
        const json =
            '"SIG_K1_KfPLgpw35iX8nfDzhbcmSBCr7nEGNEYXgmmempQspDJYBCKuAEs5rm3s4ZuLJY428Ca8ZhvR2Dkwu118y3NAoMDxhicRj9"'

        assert.equal(Serializer.encode({object}).hexString, data)
        assert.equal(JSON.stringify(Serializer.decode({data, type: Signature})), json)
        assert.equal(JSON.stringify(Serializer.decode({json, type: 'signature'})), json)
        assert.equal(JSON.stringify(object), json)
    })

    test('optionals', function () {
        assert.equal(Serializer.decode({data: '00', type: 'public_key?'}), null)
        assert.equal(Serializer.decode({data: '0101', type: 'bool?'}), true)
        assert.equal(Serializer.encode({object: null, type: 'signature?'}).hexString, '00')
        assert.throws(() => {
            Serializer.decode({object: null, type: 'bool'})
        })
        assert.throws(() => {
            Serializer.encode({object: null, type: 'bool'})
        })
    })

    test('api', function () {
        assert.throws(() => {
            Serializer.decode({json: '"foo"', type: 'santa'})
        })
        assert.throws(() => {
            const BadType: any = {abiName: 'santa'}
            Serializer.decode({json: '"foo"', type: BadType})
        })
        assert.throws(() => {
            const BadType: any = {abiName: 'santa'}
            Serializer.encode({object: 'foo', type: BadType})
        })
        assert.throws(() => {
            Serializer.encode({object: 42})
        })
    })

    test('decoding errors', function () {
        const abi = ABI.from({
            structs: [
                {
                    base: '',
                    name: 'type1',
                    fields: [{name: 'foo', type: 'type2?'}],
                },
                {
                    base: '',
                    name: 'type2',
                    fields: [{name: 'bar', type: 'type3[]'}],
                },
                {
                    base: '',
                    name: 'type3',
                    fields: [{name: 'baz', type: 'int8'}],
                },
            ],
        })
        try {
            const object = {foo: {bar: [{baz: 'not int'}]}}
            Serializer.decode({object, type: 'type1', abi})
            assert.fail()
        } catch (error) {
            assert.equal(
                error.message,
                'Decoding error at root<type1>.foo<type2?>.bar<type3[]>.0.baz<int8>: Invalid number'
            )
        }
        try {
            const data = Buffer.from('beefbeef')
            Serializer.decode({data, type: 'type1', abi})
            assert.fail()
        } catch (error) {
            assert.equal(
                error.message,
                'Decoding error at root<type1>.foo<type2?>.bar<type3[]>.6.baz<int8>: Read past end of buffer'
            )
        }
    })
})
