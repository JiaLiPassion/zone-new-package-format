/**
* @license Angular v<unknown>
* (c) 2010-2020 Google LLC. https://angular.io/
* License: MIT
*/
(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
}((function () { 'use strict';

    /**
     * @license
     * Copyright Google Inc. All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */
    Zone.__load_patch('electron', (global, Zone, api) => {
        function patchArguments(target, name, source) {
            return api.patchMethod(target, name, (delegate) => (self, args) => {
                return delegate && delegate.apply(self, api.bindArguments(args, source));
            });
        }
        const { desktopCapturer, shell, CallbacksRegistry, ipcRenderer } = require('electron');
        // patch api in renderer process directly
        // desktopCapturer
        if (desktopCapturer) {
            patchArguments(desktopCapturer, 'getSources', 'electron.desktopCapturer.getSources');
        }
        // shell
        if (shell) {
            patchArguments(shell, 'openExternal', 'electron.shell.openExternal');
        }
        // patch api in main process through CallbackRegistry
        if (!CallbacksRegistry) {
            if (ipcRenderer) {
                patchArguments(ipcRenderer, 'on', 'ipcRenderer.on');
            }
            return;
        }
        patchArguments(CallbacksRegistry.prototype, 'add', 'CallbackRegistry.add');
    });

})));
