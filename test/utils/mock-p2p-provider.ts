import {assert} from 'chai'

import { P2PEventMap, P2PProvider } from '$lib'

export class MockP2PProvider implements P2PProvider {
    public write = (_:Uint8Array) => { assert.fail('Unexpected call to P2PProvider.send') };
    public end = () => { assert.fail('Unexpected call to P2PProvider.end') };
    public destroy = (_?:Error) => { assert.fail('Unexpected call to P2PProvider.destroy') };

    private eventListeners = {} as {
        [T in keyof P2PEventMap]?: Array<P2PEventMap[T]>
    };

    public on<T extends keyof P2PEventMap>(event: T, handler: P2PEventMap[T]): this {
        if (this.eventListeners[event] === undefined) {
            this.eventListeners[event] = []
        }

        this.eventListeners[event]!.push(handler)
        
        return this
    }

    public emit<T extends keyof P2PEventMap>(event: T, args: Parameters<P2PEventMap[T]>) {
        assert.notEqual(this.eventListeners[event], undefined);
        for (const handler of this.eventListeners[event]!) {
            const erasedHandler = handler as any;
            erasedHandler(...args);
        }
    }
}