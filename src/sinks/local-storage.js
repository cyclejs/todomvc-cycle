export default function localStorageSink(todosData) {
  // Observe all todos data and save them to localStorage
  let savedTodosData = {
    list: todosData.list.map(todoData =>
      ({
        title: todoData.title,
        completed: todoData.completed,
        id: todoData.id
      })
    )
  };
  localStorage.setItem('todos-cycle', JSON.stringify(savedTodosData))
};
