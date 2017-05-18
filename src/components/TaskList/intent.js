import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {ENTER_KEY, ESC_KEY} from '../../utils';

export default function intent(domSource, historySource) {
  return {
    changeRoute$: historySource
      .map(location => location.pathname)
      .compose(dropRepeats()),

    updateInputValue$: domSource
      .select('.new-todo').events('input')
      .map(ev => ev.target.value),

    cancelInput$: domSource
      .select('.new-todo').events('keydown')
      .filter(ev => ev.keyCode === ESC_KEY),

    insertTodo$: domSource
      .select('.new-todo').events('keydown')
      .filter(ev => {
        const trimmedVal = String(ev.target.value).trim();
        return ev.keyCode === ENTER_KEY && trimmedVal;
      })
      .map(ev => String(ev.target.value).trim()),

    toggleAll$: domSource
      .select('.toggle-all').events('click')
      .map(ev => ev.target.checked),

    deleteCompleted$: domSource
      .select('.clear-completed').events('click')
      .mapTo(null),
  };
};
