export default function serialize(todos$) {
  return todos$.map(todosData => JSON.stringify(
    {
      list: todosData.list.map(todoData =>
        ({
          title: todoData.title,
          completed: todoData.completed,
          id: todoData.id
        })
      )
    }
  ));
};
