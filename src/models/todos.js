'use strict';
import {Rx} from '@cycle/core';

function getFilterFn(route) {
  switch (route) {
    case '/active': return (task => task.completed === false);
    case '/completed': return (task => task.completed === true);
    default: return () => true; // allow anything
  }
}

function determineFilter(todosData, route) {
  todosData.filter = route.replace('/', '').trim();
  todosData.filterFn = getFilterFn(route);
  return todosData;
}

function searchTodoIndex(todosList, todoid) {
  let top = todosList.length;
  let bottom = 0;
  let pointerId;
  let index;
  while (true) { // binary search
    index = bottom + ((top - bottom) >> 1);
    pointerId = todosList[index].id;
    if (pointerId === todoid) {
      return index;
    } else if (pointerId < todoid) {
      bottom = index;
    } else if (pointerId > todoid) {
      top = index;
    }
  }
}

function makeModification$(intent) {
  let clearInputMod$ = intent.clearInput$.map(() => (todosData) => {
    todosData.input = '';
    return todosData;
  });

  let insertTodoMod$ = intent.insertTodo$.map((todoTitle) => (todosData) => {
    let lastId = todosData.list.length > 0 ?
      todosData.list[todosData.list.length - 1].id :
      0;
    todosData.list.push({
      id: lastId + 1,
      title: todoTitle,
      completed: false
    });
    todosData.input = '';
    return todosData;
  });

  let editTodoMod$ = intent.editTodo$.map((evdata) => (todosData) => {
    let todoIndex = searchTodoIndex(todosData.list, evdata.id);
    todosData.list[todoIndex].title = evdata.content;
    return todosData;
  });

  let toggleTodoMod$ = intent.toggleTodo$.map((todoid) => (todosData) => {
    let todoIndex = searchTodoIndex(todosData.list, todoid);
    let previousCompleted = todosData.list[todoIndex].completed;
    todosData.list[todoIndex].completed = !previousCompleted;
    return todosData;
  });

  let toggleAllMod$ = intent.toggleAll$.map(() => (todosData) => {
    let allAreCompleted = todosData.list
      .reduce((x, y) => x && y.completed, true);
    todosData.list.forEach((todoData) => {
      todoData.completed = allAreCompleted ? false : true;
    });
    return todosData;
  });

  let deleteTodoMod$ = intent.deleteTodo$.map((todoid) => (todosData) => {
    let todoIndex = searchTodoIndex(todosData.list, todoid);
    todosData.list.splice(todoIndex, 1);
    return todosData;
  });

  let deleteCompletedsMod$ = intent.deleteCompleteds$.map(() => (todosData) => {
    todosData.list = todosData.list
      .filter(todoData => todoData.completed === false);
    return todosData
  });

  return Rx.Observable.merge(
    insertTodoMod$, deleteTodoMod$, toggleTodoMod$, toggleAllMod$,
    clearInputMod$, deleteCompletedsMod$, editTodoMod$
  );
}

function model(intent, source) {
  let modification$ = makeModification$(intent);
  let route$ = Rx.Observable.just('/').merge(intent.changeRoute$);

  return modification$
    .merge(source.todosData$)
    .scan((todosData, modFn) => modFn(todosData))
    .combineLatest(route$, determineFilter)
    .shareReplay(1);
}

export default model;
