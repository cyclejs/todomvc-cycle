import Cycle from 'cyclejs';

function merge() {
  let result = {};
  for (let i = 0; i < arguments.length; i++) {
    let object = arguments[i];
    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        result[key] = object[key];
      }
    }
  }
  return result;
}

let defaultTodosData = {
  list: [],
  input: '',
  filter: '',
  filterFn: () => true // allow anything
};

let storedTodosData = JSON.parse(localStorage.getItem('todos-cycle')) || {};

let initialTodosData = merge(defaultTodosData, storedTodosData);

export default {
  todosData$: Cycle.Rx.Observable.just(initialTodosData)
};
