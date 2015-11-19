import {run} from '@cycle/core';
import CycleDOM from '@cycle/dom';
import {Observable} from 'rx'
import Todos from './components/Todos/index';
import CustomDrivers from './drivers';

const main = Todos;

run(main, {
  DOM: CycleDOM.makeDOMDriver('.todoapp'),
  localStorageSource: CustomDrivers.makeLocalStorageSourceDriver('todos-cycle'),
  localStorageSink: CustomDrivers.makeLocalStorageSinkDriver('todos-cycle'),
  initialHash: () => Observable.just(window.location.hash),
  hashchange: () => Observable.fromEvent(window, 'hashchange')
});
