export default function serialize(state$) {
  return state$.map(state => JSON.stringify(
    {
      list: state.list.map(todoData =>
        ({
          title: todoData.title,
          completed: todoData.completed
        })
      )
    }
  ));
};
