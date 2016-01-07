import {run} from '@cycle/core';
import CycleDOM from '@cycle/dom';
import {Observable} from 'rx'
import Todos from './components/Todos/index';
// import CustomDrivers from './drivers';
import storageDriver from '@cycle/storage';
import todos from './components/todos/index';

const main = Todos;

run(main, {
  DOM: CycleDOM.makeDOMDriver('.todoapp'),
  initialHash: () => Observable.just(window.location.hash),
  hashchange: () => Observable.fromEvent(window, 'hashchange'),
  storage: storageDriver
});
