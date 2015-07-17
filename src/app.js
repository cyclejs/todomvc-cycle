import Cycle from '@cycle/core';
import CycleWeb from '@cycle/web';
import todoItemComponent from './components/todo-item';
import source from './sources/todos';
import intent from './intents/todos';
import model from './models/todos';
import view from './views/todos';
import localStorageSink from './sinks/local-storage.js';

function main(drivers) {
  let todos$ = model(intent(drivers.DOM, drivers.hashchange), source);
  todos$.subscribe(localStorageSink);
  return view(todos$);
}

Cycle.run(main, {
  DOM: CycleWeb.makeDOMDriver('#todoapp', {
    'todo-item': todoItemComponent
  }),
  hashchange: () => Cycle.Rx.Observable.fromEvent(window, 'hashchange')
});
