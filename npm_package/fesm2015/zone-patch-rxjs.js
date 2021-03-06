/**
* @license Angular v<unknown>
* (c) 2010-2020 Google LLC. https://angular.io/
* License: MIT
*/
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('rxjs')) :
    typeof define === 'function' && define.amd ? define(['rxjs'], factory) :
    (global = global || self, factory(global.rxjs));
}(this, (function (rxjs) { 'use strict';

    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    Zone.__load_patch('rxjs', (global, Zone, api) => {
        const symbol = Zone.__symbol__;
        const nextSource = 'rxjs.Subscriber.next';
        const errorSource = 'rxjs.Subscriber.error';
        const completeSource = 'rxjs.Subscriber.complete';
        const ObjectDefineProperties = Object.defineProperties;
        const patchObservable = function () {
            const ObservablePrototype = rxjs.Observable.prototype;
            const _symbolSubscribe = symbol('_subscribe');
            const _subscribe = ObservablePrototype[_symbolSubscribe] = ObservablePrototype._subscribe;
            ObjectDefineProperties(rxjs.Observable.prototype, {
                _zone: { value: null, writable: true, configurable: true },
                _zoneSource: { value: null, writable: true, configurable: true },
                _zoneSubscribe: { value: null, writable: true, configurable: true },
                source: {
                    configurable: true,
                    get: function () { return this._zoneSource; },
                    set: function (source) {
                        this._zone = Zone.current;
                        this._zoneSource = source;
                    }
                },
                _subscribe: {
                    configurable: true,
                    get: function () {
                        if (this._zoneSubscribe) {
                            return this._zoneSubscribe;
                        }
                        else if (this.constructor === rxjs.Observable) {
                            return _subscribe;
                        }
                        const proto = Object.getPrototypeOf(this);
                        return proto && proto._subscribe;
                    },
                    set: function (subscribe) {
                        this._zone = Zone.current;
                        if (!subscribe) {
                            this._zoneSubscribe = subscribe;
                        }
                        else {
                            this._zoneSubscribe = function () {
                                if (this._zone && this._zone !== Zone.current) {
                                    const tearDown = this._zone.run(subscribe, this, arguments);
                                    if (typeof tearDown === 'function') {
                                        const zone = this._zone;
                                        return function () {
                                            if (zone !== Zone.current) {
                                                return zone.run(tearDown, this, arguments);
                                            }
                                            return tearDown.apply(this, arguments);
                                        };
                                    }
                                    else {
                                        return tearDown;
                                    }
                                }
                                else {
                                    return subscribe.apply(this, arguments);
                                }
                            };
                        }
                    }
                },
                subjectFactory: {
                    get: function () { return this._zoneSubjectFactory; },
                    set: function (factory) {
                        const zone = this._zone;
                        this._zoneSubjectFactory = function () {
                            if (zone && zone !== Zone.current) {
                                return zone.run(factory, this, arguments);
                            }
                            return factory.apply(this, arguments);
                        };
                    }
                }
            });
        };
        api.patchMethod(rxjs.Observable.prototype, 'lift', (delegate) => (self, args) => {
            const observable = delegate.apply(self, args);
            if (observable.operator) {
                observable.operator._zone = Zone.current;
                api.patchMethod(observable.operator, 'call', (operatorDelegate) => (operatorSelf, operatorArgs) => {
                    if (operatorSelf._zone && operatorSelf._zone !== Zone.current) {
                        return operatorSelf._zone.run(operatorDelegate, operatorSelf, operatorArgs);
                    }
                    return operatorDelegate.apply(operatorSelf, operatorArgs);
                });
            }
            return observable;
        });
        const patchSubscription = function () {
            ObjectDefineProperties(rxjs.Subscription.prototype, {
                _zone: { value: null, writable: true, configurable: true },
                _zoneUnsubscribe: { value: null, writable: true, configurable: true },
                _unsubscribe: {
                    get: function () {
                        if (this._zoneUnsubscribe) {
                            return this._zoneUnsubscribe;
                        }
                        const proto = Object.getPrototypeOf(this);
                        return proto && proto._unsubscribe;
                    },
                    set: function (unsubscribe) {
                        this._zone = Zone.current;
                        if (!unsubscribe) {
                            this._zoneUnsubscribe = unsubscribe;
                        }
                        else {
                            this._zoneUnsubscribe = function () {
                                if (this._zone && this._zone !== Zone.current) {
                                    return this._zone.run(unsubscribe, this, arguments);
                                }
                                else {
                                    return unsubscribe.apply(this, arguments);
                                }
                            };
                        }
                    }
                }
            });
        };
        const patchSubscriber = function () {
            const next = rxjs.Subscriber.prototype.next;
            const error = rxjs.Subscriber.prototype.error;
            const complete = rxjs.Subscriber.prototype.complete;
            Object.defineProperty(rxjs.Subscriber.prototype, 'destination', {
                configurable: true,
                get: function () { return this._zoneDestination; },
                set: function (destination) {
                    this._zone = Zone.current;
                    this._zoneDestination = destination;
                }
            });
            // patch Subscriber.next to make sure it run
            // into SubscriptionZone
            rxjs.Subscriber.prototype.next = function () {
                const currentZone = Zone.current;
                const subscriptionZone = this._zone;
                // for performance concern, check Zone.current
                // equal with this._zone(SubscriptionZone) or not
                if (subscriptionZone && subscriptionZone !== currentZone) {
                    return subscriptionZone.run(next, this, arguments, nextSource);
                }
                else {
                    return next.apply(this, arguments);
                }
            };
            rxjs.Subscriber.prototype.error = function () {
                const currentZone = Zone.current;
                const subscriptionZone = this._zone;
                // for performance concern, check Zone.current
                // equal with this._zone(SubscriptionZone) or not
                if (subscriptionZone && subscriptionZone !== currentZone) {
                    return subscriptionZone.run(error, this, arguments, errorSource);
                }
                else {
                    return error.apply(this, arguments);
                }
            };
            rxjs.Subscriber.prototype.complete = function () {
                const currentZone = Zone.current;
                const subscriptionZone = this._zone;
                // for performance concern, check Zone.current
                // equal with this._zone(SubscriptionZone) or not
                if (subscriptionZone && subscriptionZone !== currentZone) {
                    return subscriptionZone.run(complete, this, arguments, completeSource);
                }
                else {
                    return complete.call(this);
                }
            };
        };
        patchObservable();
        patchSubscription();
        patchSubscriber();
    });

})));
