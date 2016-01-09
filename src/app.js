import {run} from '@cycle/core';
import CycleDOM from '@cycle/dom';
import {Observable} from 'rx';
import storageDriver from '@cycle/storage';
// THE MAIN FUNCTION
// This is the todo list component.
import Todos from './components/Todos/index';

const main = Todos;

// THE ENTRY POINT
// This is where the whole story starts.
// `run` receives a main function and an object
// with the drivers.
run(main, {
  // THE DOM DRIVER
  // `makeDOMDriver(container)` from Cycle DOM returns a
  // driver function to interact with the DOM.
  DOM: CycleDOM.makeDOMDriver('.todoapp'),
  // THE INITAL HASH STREAM
  // A driver that only delivers the initial hash value as source.
  initialHash: () => Observable.just(window.location.hash),
  // THE HASH CHANGE STREAM
  // A driver that delivers the hash value on the hashChange event, as source.
  hashchange: () => Observable.fromEvent(window, 'hashchange'),
  // THE STORAGE DRIVER
  // The storage driver which can be used to access values for
  // local- and sessionStorage keys as streams.
  storage: storageDriver
});
