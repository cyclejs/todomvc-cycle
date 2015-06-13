import Cycle from 'cyclejs';
import {fromJS} from 'immutable';

let defaultTodosData = fromJS({
  list: [],
  input: '',
  filter: '',
  filterFn: () => true // allow anything
});

let storedTodosData = JSON.parse(localStorage.getItem('todos-cycle')) || {};

let initialTodosData = defaultTodosData.merge(storedTodosData);

export default {
  todosData$: Cycle.Rx.Observable.just(initialTodosData)
};
