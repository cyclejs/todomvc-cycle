import xs from 'xstream';

function model(props$, action$) {
  // THE SANITIZED PROPERTIES
  // If the list item has no data set it as empty and not completed.
  let sanitizedProps$ = props$.startWith({title: '', completed: false});

  // THE EDITING STREAM
  // Create a stream that emits booleans that represent the
  // "is editing" state.
  let editing$ =
    xs.merge(
      action$.filter(a => a.type === 'startEdit').mapTo(true),
      action$.filter(a => a.type === 'doneEdit').mapTo(false),
      action$.filter(a => a.type === 'cancelEdit').mapTo(false)
    )
    .startWith(false);

  return xs.combine(sanitizedProps$, editing$)
    .map(([{title, completed}, editing]) => ({
      title,
      isCompleted: completed,
      isEditing: editing,
    }));
}

export default model;
