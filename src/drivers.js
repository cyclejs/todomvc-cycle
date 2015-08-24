import {Rx} from '@cycle/core';

function makeLocalStorageSourceDriver(keyName) {
  return () => Rx.Observable.just(localStorage.getItem(keyName));
}

function makeLocalStorageSinkDriver(keyName) {
  return function (keyValue$) {
    keyValue$.subscribe(keyValue => {
      localStorage.setItem(keyName, keyValue)
    });
  };
}

export default {makeLocalStorageSinkDriver, makeLocalStorageSourceDriver};
