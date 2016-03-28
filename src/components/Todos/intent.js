import {filterLinks} from '@cycle/history';
import {Observable} from 'rx';
import {ENTER_KEY, ESC_KEY} from '../../utils';

// THE INTENT FOR THE LIST
export default function intent(DOM, History, itemAction$) {
  return {
    // THE ROUTE STREAM
    // A stream that provides the path whenever the route changes.
    changeRoute$: History
      .startWith({
        pathname: '/',
      })
      .map(location => location.pathname),

    // THE URL STREAM
    // A stream of URL clicks in the app
    url$: DOM
      .select('a')
      .events('click')
      .filter(filterLinks)
      .map(event =>  event.target.hash.replace('#', '')),

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
