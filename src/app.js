import {run, Rx} from '@cycle/core';
import CycleDOM from '@cycle/dom';
import storageDriver from '@cycle/storage';
import todos from './components/todos/index';

const main = todos;

run(main, {
  DOM: CycleDOM.makeDOMDriver('.todoapp'),
  initialHash: () => Rx.Observable.just(window.location.hash),
  hashchange: () => Rx.Observable.fromEvent(window, 'hashchange'),
  storage: storageDriver
});
