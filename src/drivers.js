import {Observable} from 'rx';

function makeLocalStorageSourceDriver(keyName) {
  return () => Observable.just(localStorage.getItem(keyName));
}

function makeLocalStorageSinkDriver(keyName) {
  return function (keyValue$) {
    keyValue$.subscribe(keyValue => {
      localStorage.setItem(keyName, keyValue)
    });
  };
}

export default {makeLocalStorageSinkDriver, makeLocalStorageSourceDriver};
