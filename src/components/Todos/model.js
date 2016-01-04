import {Observable} from 'rx';

function getFilterFn(route) {
  switch (route) {
    case '/active': return (task => task.completed === false);
    case '/completed': return (task => task.completed === true);
    default: return () => true; // allow anything
  }
}

function searchTodoIndex(todosList, todoid) {
  let pointerId;
  let index;
  let top = todosList.length;
  let bottom = 0;
  for (let i = todosList.length - 1; i >= 0; i--) { // binary search
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
  const clearInputMod$ = actions.clearInput$.map(() => (todosData) => {
    return todosData;
  });

  const insertTodoMod$ = actions.insertTodo$.map((todoTitle) => (todosData) => {
    const lastId = todosData.list.length > 0 ?
      todosData.list[todosData.list.length - 1].id :
      0;
    todosData.list.push({
      id: lastId + 1,
      title: todoTitle,
      completed: false
    });
    return todosData;
  });

  const editTodoMod$ = actions.editTodo$.map(action => (todosData) => {
    const todoIndex = searchTodoIndex(todosData.list, action.id);
    todosData.list[todoIndex].title = action.title;
    return todosData;
  });

  const toggleTodoMod$ = actions.toggleTodo$.map(action => (todosData) => {
    const todoIndex = searchTodoIndex(todosData.list, action.id);
    const previousCompleted = todosData.list[todoIndex].completed;
    todosData.list[todoIndex].completed = !previousCompleted;
    return todosData;
  });

  const toggleAllMod$ = actions.toggleAll$.map(() => (todosData) => {
    const allAreCompleted = todosData.list
      .reduce((x, y) => x && y.completed, true);
    todosData.list.forEach((todoData) => {
      todoData.completed = allAreCompleted ? false : true;
    });
    return todosData;
  });

  const deleteTodoMod$ = actions.deleteTodo$.map(action => (todosData) => {
    const todoIndex = searchTodoIndex(todosData.list, action.id);
    todosData.list.splice(todoIndex, 1);
    return todosData;
  });

  const deleteCompletedsMod$ = actions.deleteCompleteds$.map(() => (todosData) => {
    todosData.list = todosData.list
      .filter(todoData => todoData.completed === false);
    return todosData
  });

  const changeRouteMod$ = actions.changeRoute$.startWith('/').map(route => {
    const filterFn = getFilterFn(route)
    return (todosData) => {
      todosData.filter = route.replace('/', '').trim();
      todosData.filterFn = filterFn;
      return todosData;
    }
  });

  return Observable.merge(
    insertTodoMod$, deleteTodoMod$, toggleTodoMod$, toggleAllMod$,
    clearInputMod$, deleteCompletedsMod$, editTodoMod$, changeRouteMod$
  );
}

function model(actions, sourceTodosData$) {
  const modification$ = makeModification$(actions);

  return sourceTodosData$
    .concat(modification$)
    .scan((todosData, modFn) => modFn(todosData))
    .shareReplay(1);
}

export default model;
