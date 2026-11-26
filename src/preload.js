'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const OK = ['state', 'saveEf', 'setEstado', 'deleteEf', 'saveConfig', 'anos', 'sendTest', 'emails', 'history', 'agenda', 'anuario', 'retry'];
contextBridge.exposeInMainWorld('api', Object.fromEntries(OK.map(n => [n, (...a) => ipcRenderer.invoke(n, ...a).then(r => { if (!r.ok) throw new Error(r.error); return r.data; })])));
