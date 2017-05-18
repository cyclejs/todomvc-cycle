import xs from 'xstream';
import {ENTER_KEY, ESC_KEY} from '../../utils';

export default function intent(domSource) {
  const editEnterEvent$ = domSource
    .select('.edit').events('keyup')
    .filter(ev => ev.keyCode === ENTER_KEY);

  const editBlurEvent$ = domSource.select('.edit').events('blur', true);

  return {
    startEdit$: domSource
      .select('label').events('dblclick')
      .mapTo(null),

    doneEdit$: xs.merge(editEnterEvent$, editBlurEvent$)
      .map(ev => ev.target.value),

    cancelEdit$: domSource
      .select('.edit').events('keyup')
      .filter(ev => ev.keyCode === ESC_KEY)
      .mapTo(null),

    toggle$: domSource
      .select('.toggle').events('change')
      .map(ev => ev.target.checked),

    destroy$: domSource
      .select('.destroy').events('click')
      .mapTo(null),
  }
}
