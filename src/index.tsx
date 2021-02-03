/* eslint-disable */

import React from 'react';
import { render } from 'react-dom';
import { configure } from 'mobx';

import App from './App';
import { RootStore } from './common/store';

import './App.global.css';

configure({ enforceActions: "observed" });

type debugStoreWindow = typeof window & {debugStore: RootStore};

const store = (window as debugStoreWindow).debugStore ?? new RootStore();
(window as debugStoreWindow).debugStore = store;

render(<App rootStore={store} />, document.getElementById('root'));
