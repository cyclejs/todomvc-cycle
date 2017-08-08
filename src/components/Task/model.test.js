import test from 'tape';
import xs from 'xstream';
import model from './model';

test('doneEdit updates the title of the todo', assert => {
  const expected = 'newTitle';
  const actions = {
    startEdit$: xs.empty(),
    doneEdit$: xs.fromArray([expected]),
    cancelEdit$: xs.empty(),
    toggle$: xs.empty(),
    destroy$: xs.empty()
  };
  model(actions)
    .addListener({
      next(reducer) {
        const previousTodoState = {title: 'oldTitle'};
        const newTodoState = reducer(previousTodoState);
        const actual = newTodoState.title;
        assert.deepEqual(actual, expected);
      },
      error(err) {
        throw err;
      },
      complete() {
        assert.end();
      }
    })
  });
