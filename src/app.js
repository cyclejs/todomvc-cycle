import {run, Rx} from '@cycle/core';
import CycleDOM from '@cycle/dom';
import todos from './components/todos/index';
import CustomDrivers from './drivers';

const main = todos;

run(main, {
  DOM: CycleDOM.makeDOMDriver('.todoapp'),
  localStorageSource: CustomDrivers.makeLocalStorageSourceDriver('todos-cycle'),
  localStorageSink: CustomDrivers.makeLocalStorageSinkDriver('todos-cycle'),
  initialHash: () => Rx.Observable.just(window.location.hash),
  hashchange: () => Rx.Observable.fromEvent(window, 'hashchange')
});
