export default function localStorageSink(todosData) {

  // Observe all todos data and save them to localStorage
  let savedTodosData = {
    list: todosData.get('list').filter(x => x ).toJS()
  };

  localStorage.setItem('todos-cycle', JSON.stringify(savedTodosData))
};
