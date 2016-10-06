import xs from 'xstream';
import flattenSequentially from 'xstream/extra/flattenSequentially';

function getFilterFn(route) {
  switch (route) {
    case '/active': return (task => task.completed === false);
    case '/completed': return (task => task.completed === true);
    default: return () => true; // allow anything
  }
}

export default function model(action$, sourceTodosData$) {
  const sourceTodosReducer$ = sourceTodosData$
    .map(sourceTodos => function sourceTodosReducer(prevState) {
      return sourceTodos;
    });

  const changeRouteReducer$ = action$
    .filter(ac => ac.type === 'changeRoute')
    .map(ac => ac.payload)
    .startWith('/')
    .map(path => {
      const filterFn = getFilterFn(path);
      return function changeRouteReducer(todosData) {
        todosData.filter = path.replace('/', '').trim();
        todosData.filterFn = filterFn;
        return todosData;
      };
    });

  const clearInputReducer$ = action$
    .filter(ac => ac.type === 'cancelInput' || ac.type === 'insertTodo')
    .map(ac => xs.of(true, false))
    .compose(flattenSequentially)
    .map(inputShouldClear => function clearInputReducer(prevState) {
      return {...prevState, inputShouldClear};
    });

  const insertTodoReducer$ = action$
    .filter(ac => ac.type === 'insertTodo')
    .map(action => function insertTodoReducer(prevState) {
      const newTodo = {
        title: action.payload,
        completed: false,
        editing: false,
      };
      return {
        ...prevState,
        list: prevState.list.concat(newTodo),
      }
    });

  const toggleAllReducer$ = action$
    .filter(ac => ac.type === 'toggleAll')
    .map(action => function toggleAllReducer(prevState) {
      return {
        ...prevState,
        list: prevState.list.map(task =>
          ({...task, completed: action.payload})
        ),
      }
    });

  const deleteCompletedReducer$ = action$
    .filter(ac => ac.type === 'deleteCompleted')
    .mapTo(function deleteCompletedsReducer(prevState) {
      return {
        ...prevState,
        list: prevState.list.filter(task => task.completed === false),
      };
    });

  return xs.merge(
    sourceTodosReducer$,
    changeRouteReducer$,
    clearInputReducer$,
    insertTodoReducer$,
    toggleAllReducer$,
    deleteCompletedReducer$
  );
}
