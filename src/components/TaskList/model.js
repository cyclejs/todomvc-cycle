import xs from 'xstream';

function getFilterFn(route) {
  switch (route) {
    case '/active': return (task => task.completed === false);
    case '/completed': return (task => task.completed === true);
    default: return () => true; // allow anything
  }
}

let uuid = Date.now();

export default function model(actions) {
  const initialReducer$ = xs.of(function initialReducer(prevState) {
    if (prevState) {
      return prevState;
    } else {
      return {
        inputValue: '',
        list: [],
        filter: '',
        filterFn: () => true, // allow anything
      };
    }
  });

  const changeRouteReducer$ = actions.changeRoute$
    .startWith('/')
    .map(path => {
      const filterFn = getFilterFn(path);
      return function changeRouteReducer(prevState) {
        return {
          ...prevState,
          filter: path.replace('/', '').trim(),
          filterFn: filterFn,
        }
      };
    });

  const updateInputValueReducer$ = actions.updateInputValue$
    .map(inputValue => function updateInputValue(prevState) {
      return {...prevState, inputValue: inputValue};
    });

  const clearInputReducer$ = xs.merge(actions.cancelInput$, actions.insertTodo$)
    .mapTo(function clearInputReducer(prevState) {
      return {...prevState, inputValue: ''};
    });

  const insertTodoReducer$ = actions.insertTodo$
    .map(content => function insertTodoReducer(prevState) {
      const newTodo = {
        key: uuid++,
        title: content,
        completed: false,
        editing: false,
      };
      return {
        ...prevState,
        list: prevState.list.concat(newTodo),
      }
    });

  const toggleAllReducer$ = actions.toggleAll$
    .map(isToggled => function toggleAllReducer(prevState) {
      return {
        ...prevState,
        list: prevState.list.map(task =>
          ({...task, completed: isToggled})
        ),
      }
    });

  const deleteCompletedReducer$ = actions.deleteCompleted$
    .mapTo(function deleteCompletedsReducer(prevState) {
      return {
        ...prevState,
        list: prevState.list.filter(task => task.completed === false),
      };
    });

  return xs.merge(
    initialReducer$,
    updateInputValueReducer$,
    changeRouteReducer$,
    clearInputReducer$,
    insertTodoReducer$,
    toggleAllReducer$,
    deleteCompletedReducer$
  );
}
