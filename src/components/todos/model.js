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
  for (var i = todosList.length - 1; i >= 0; i--) { // binary search
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
  return null;
}

function makeModification$(actions) {
  let clearInputMod$ = actions.clearInput$.map(() => (todosData) => {
    return todosData;
  });

  let insertTodoMod$ = actions.insertTodo$.map((todoTitle) => (todosData) => {
    let lastId = todosData.list.length > 0 ?
      todosData.list[todosData.list.length - 1].id :
      0;
    todosData.list.push({
      id: lastId + 1,
      title: todoTitle,
      completed: false
    });
    return todosData;
  });

  let editTodoMod$ = actions.editTodo$.map(action => (todosData) => {
    let todoIndex = searchTodoIndex(todosData.list, action.id);
    todosData.list[todoIndex].title = action.title;
    return todosData;
  });

  let toggleTodoMod$ = actions.toggleTodo$.map(id => (todosData) => {
    let todoIndex = searchTodoIndex(todosData.list, id);
    let previousCompleted = todosData.list[todoIndex].completed;
    todosData.list[todoIndex].completed = !previousCompleted;
    return todosData;
  });

  let toggleAllMod$ = actions.toggleAll$.map(() => (todosData) => {
    let allAreCompleted = todosData.list
      .reduce((x, y) => x && y.completed, true);
    todosData.list.forEach((todoData) => {
      todoData.completed = allAreCompleted ? false : true;
    });
    return todosData;
  });

  let deleteTodoMod$ = actions.deleteTodo$.map(id => (todosData) => {
    let todoIndex = searchTodoIndex(todosData.list, id);
    todosData.list.splice(todoIndex, 1);
    return todosData;
  });

  let deleteCompletedsMod$ = actions.deleteCompleteds$.map(() => (todosData) => {
    todosData.list = todosData.list
      .filter(todoData => todoData.completed === false);
    return todosData
  });

  return Rx.Observable.merge(
    insertTodoMod$, deleteTodoMod$, toggleTodoMod$, toggleAllMod$,
    clearInputMod$, deleteCompletedsMod$, editTodoMod$
  );
}

function model(actions, sourceTodosData$) {
  let modification$ = makeModification$(actions);
  let route$ = Rx.Observable.just('/').merge(actions.changeRoute$);

  return modification$
    .merge(sourceTodosData$)
    .scan((todosData, modFn) => modFn(todosData))
    .combineLatest(route$, determineFilter)
    .shareReplay(1);
}

export default model;
