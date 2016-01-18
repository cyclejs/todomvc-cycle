import {Observable} from 'rx';
import {ENTER_KEY, ESC_KEY} from '../../utils';

// THE INTENT FOR THE LIST
export default function intent(DOM, hashchange, initialHash, itemAction$) {
  return {
    // THE ROUTE STREAM
    // A stream that provides the URL hash value whenever
    // the route changes, starting with the initial hash value.
    changeRoute$: Observable.concat(
      initialHash.map(hash => hash.replace('#', '')),
      hashchange.map(ev => ev.newURL.match(/\#[^\#]*$/)[0].replace('#', ''))
    ),

    // CLEAR INPUT STREAM
    // A stream of ESC key strokes in the `.new-todo` field.
    clearInput$: DOM.select('.new-todo').events('keydown')
      .filter(ev => ev.keyCode === ESC_KEY),

    // ENTER KEY STREAM
    // A stream of ENTER key strokes in the `.new-todo` field.
    insertTodo$: DOM.select('.new-todo').events('keydown')
      // Trim value and only let the data through when there
      // is anything but whitespace in the field and the ENTER key was hit.
      .filter(ev => {
        const trimmedVal = String(ev.target.value).trim();
        return ev.keyCode === ENTER_KEY && trimmedVal;
      })
      // Return the trimmed value.
      .map(ev => String(ev.target.value).trim()),

    // TOGGLE STREAM
    // Create a stream out of all the toggle actions on the todo items.
    toggleTodo$: itemAction$.filter(action => action.type === 'toggle'),

    // DELETE STREAM
    // Create a stream out of all the destroy actions on the todo items.
    deleteTodo$: itemAction$.filter(action => action.type === 'destroy'),

    // EDIT STREAM
    // Create a stream out of all the doneEdit actions on the todo items.
    editTodo$: itemAction$.filter(action => action.type === 'doneEdit'),

    // TOGGLE ALL STREAM
    // Create a stream out of the clicks on the `.toggle-all` button.
    toggleAll$: DOM.select('.toggle-all').events('click'),

    // DELETE COMPLETED TODOS STREAM
    // A stream of click events on the `.clear-completed` element.
    deleteCompleteds$: DOM.select('.clear-completed').events('click')
  };
};
