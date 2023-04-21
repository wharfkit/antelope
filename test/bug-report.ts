import {assert} from 'chai'

// You can access all of the exported types from `$lib`.
import {Asset} from '$lib'

suite('bug-report', function () {
    test('Edit this string to include a brief description of the issue', function () {
        // Write code here that reproduces the issue.
        const balance = Asset.from('0.0001 EOS')
        // Use chai to create assertions with the expected types and values.
        // assert.equal(String(balance), '0.0002 EOS') // This will fail the test
    })
})
