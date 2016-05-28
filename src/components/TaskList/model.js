import xs from 'xstream';
import concat from 'xstream/extra/concat';

// A helper function that provides filter functions
// depending on the route value.
function getFilterFn(route) {
  switch (route) {
    case '/active': return (task => task.completed === false);
    case '/completed': return (task => task.completed === true);
    default: return () => true; // allow anything
  }
}

// This search function is used in the `makeReducer$`
// function below to retrieve the index of a todo in the todosList
// in order to make a modification to the todo data.
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

// MAKE REDUCER STREAM
// A function that takes the actions on the todo list
// and returns a stream of "reducers": functions that expect the current
// todosData (the state) and return a new version of todosData.
function makeReducer$(action$) {
  let clearInputReducer$ = action$
    .filter(a => a.type === 'clearInput')
    .mapTo(function clearInputReducer(todosData) {
      return todosData;
    });

  let insertTodoReducer$ = action$
    .filter(a => a.type === 'insertTodo')
    .map(action => function insertTodoReducer(todosData) {
      let lastId = todosData.list.length > 0 ?
        todosData.list[todosData.list.length - 1].id :
        0;
      todosData.list.push({
        id: lastId + 1,
        title: action.payload,
        completed: false
      });
      return todosData;
    });

  let editTodoReducer$ = action$
    .filter(a => a.type === 'editTodo')
    .map(action => function editTodoReducer(todosData) {
      let todoIndex = searchTodoIndex(todosData.list, action.id);
      todosData.list[todoIndex].title = action.title;
      return todosData;
    });

  let toggleTodoReducer$ = action$
    .filter(a => a.type === 'toggleTodo')
    .map(action => function toggleTodoReducer(todosData) {
      let todoIndex = searchTodoIndex(todosData.list, action.id);
      let previousCompleted = todosData.list[todoIndex].completed;
      todosData.list[todoIndex].completed = !previousCompleted;
      return todosData;
    });

  let toggleAllReducer$ = action$
    .filter(a => a.type === 'toggleAll')
    .mapTo(function toggleAllReducer(todosData) {
      let allAreCompleted = todosData.list
        .reduce((x, y) => x && y.completed, true);
      todosData.list.forEach((todoData) => {
        todoData.completed = allAreCompleted ? false : true;
      });
      return todosData;
    });

  let deleteTodoReducer$ = action$
    .filter(a => a.type === 'deleteTodo')
    .map(action => function deleteTodoReducer(todosData) {
      let todoIndex = searchTodoIndex(todosData.list, action.id);
      todosData.list.splice(todoIndex, 1);
      return todosData;
    });

  let deleteCompletedsReducer$ = action$
    .filter(a => a.type === 'deleteCompleteds')
    .mapTo(function deleteCompletedsReducer(todosData) {
      todosData.list = todosData.list
        .filter(todoData => todoData.completed === false);
      return todosData;
    });

  let changeRouteReducer$ = action$
    .filter(a => a.type === 'changeRoute')
    .map(a => a.payload)
    .startWith('/')
    .map(path => {
      let filterFn = getFilterFn(path);
      return function changeRouteReducer(todosData) {
        todosData.filter = path.replace('/', '').trim();
        todosData.filterFn = filterFn;
        return todosData;
      };
    });

  return xs.merge(
    clearInputReducer$,
    insertTodoReducer$,
    editTodoReducer$,
    toggleTodoReducer$,
    toggleAllReducer$,
    deleteTodoReducer$,
    deleteCompletedsReducer$,
    changeRouteReducer$
  );
}

// THIS IS THE MODEL FUNCTION
// It expects the actions coming in from the todo items and
// the initial localStorage data.
function model(action$, sourceTodosData$) {
  // THE BUSINESS LOGIC
  // Actions are passed to the `makeReducer$` function
  // which creates a stream of reducer functions that needs
  // to be applied on the todoData when an action happens.
  let reducer$ = makeReducer$(action$);

  // RETURN THE MODEL DATA
  return sourceTodosData$.map(sourceTodosData =>
    reducer$.fold((todosData, reducer) => reducer(todosData), sourceTodosData)
  ).flatten()
  // Make this remember its latest event, so late listeners
  // will be updated with the latest state.
  .remember();
}

export default model;
