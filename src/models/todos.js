import Cycle from 'cyclejs';
import {Map} from 'immutable';

function getFilterFn(route) {
  switch (route) {
    case '/active': return (x => !x.get('completed'));
    case '/completed': return (x => x.get('completed'));
    default: return () => true; // allow anything
  }
}

function determineFilter(todosData, route) {
  return todosData
    .set('filter', route.replace('/', '').trim())
    .set('filterFn', getFilterFn(route));
}

function makeModification$(intent) {
  let clearInputMod$ = intent.clearInput$.map(() => todosData => {
    return todosData.set('input', '');
  });

  let insertTodoMod$ = intent.insertTodo$.map(todoTitle => todosData => {
    let list = todosData.get('list');
    let lastId = list.size ? list.last().get('id') : 0;

    let todo = Map({
      id: lastId + 1,
      title: todoTitle,
      completed: false
    });

    return todosData.update('list', list => list.push(todo).set('input', ''));
  });

  let editTodoMod$ = intent.editTodo$.map(evdata => todosData => {
    let todoIndex = todosData.get('list')
      .findIndex(x => x.get('id') === evdata.id);

    return todosData.update('list', list =>
      list.update(todoIndex, x => x.set('title', evdata.content))
    );
  });

  let toggleTodoMod$ = intent.toggleTodo$.map(todoId => todosData => {
    let todoIndex = todosData.get('list')
      .findIndex(x => x.get('id') === todoId);

    return todosData.update('list', list =>
      list.update(todoIndex, x => x.set('completed', !x.get('completed')))
    );
  });

  let toggleAllMod$ = intent.toggleAll$.map(() => todosData => {
    let state = todosData.get('list').some(x => !x.get('completed'));
    return todosData.update('list', list =>
      list.map(x => x.set('completed', state))
    );
  });

  let deleteTodoMod$ = intent.deleteTodo$.map(todoId => todosData => {
    return todosData.update('list', list =>
      list.filter(x => x.get('id') !== todoId)
    );
  });

  let deleteCompletedsMod$ = intent.deleteCompleteds$.map(() => todosData => {
    return todosData.update('list', list =>
      list.filter(x => !x.get('completed'))
    );
  });

  return Cycle.Rx.Observable.merge(
    insertTodoMod$, deleteTodoMod$, toggleTodoMod$, toggleAllMod$,
    clearInputMod$, deleteCompletedsMod$, editTodoMod$
  );
}

function model(intent, source) {
  let modification$ = makeModification$(intent);
  let route$ = Cycle.Rx.Observable.just('/').merge(intent.changeRoute$);

  return modification$
    .merge(source.todosData$)
    .scan((todosData, modFn) => modFn(todosData))
    .combineLatest(route$, determineFilter)
    .shareReplay(1);
}

export default model;
