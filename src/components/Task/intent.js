import xs from 'xstream';
import {ENTER_KEY, ESC_KEY} from '../../utils';

// THE TODO ITEM INTENT
// This intent function returns a stream of all the different,
// actions that can be taken on a todo.
function intent(DOMSource) {
  // THE INTENT MERGE
  // Merge all actions into one stream.
  return xs.merge(
    // THE DESTROY ACTION STREAM
    DOMSource.select('.destroy').events('click')
      .mapTo({type: 'destroy'}),

    // THE TOGGLE ACTION STREAM
    DOMSource.select('.toggle').events('change')
      .mapTo({type: 'toggle'}),

    // THE START EDIT ACTION STREAM
    DOMSource.select('label').events('dblclick')
      .mapTo({type: 'startEdit'}),

    // THE ESC KEY ACTION STREAM
    DOMSource.select('.edit').events('keyup')
      .filter(ev => ev.keyCode === ESC_KEY)
      .mapTo({type: 'cancelEdit'}),

    // THE ENTER KEY ACTION STREAM
    DOMSource.select('.edit').events('keyup')
      .filter(ev => ev.keyCode === ENTER_KEY)
      .compose(s => xs.merge(s, DOMSource.select('.edit').events('blur', true)))
      .map(ev => ({title: ev.target.value, type: 'doneEdit'}))
  );
}

export default intent;
