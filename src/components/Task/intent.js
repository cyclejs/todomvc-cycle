import xs from 'xstream';
import {ENTER_KEY, ESC_KEY} from '../../utils';

export default function intent(domSource) {
  const startEditAction$ = domSource
    .select('label').events('dblclick')
    .mapTo({type: 'startEdit'});

  const doneEditAction$ = domSource
    .select('.edit').events('keyup')
    .filter(ev => ev.keyCode === ENTER_KEY)
    .compose(s => xs.merge(s, domSource.select('.edit').events('blur', true)))
    .map(ev => ({payload: ev.target.value, type: 'doneEdit'}));

  const cancelEditAction$ = domSource
    .select('.edit').events('keyup')
    .filter(ev => ev.keyCode === ESC_KEY)
    .mapTo({type: 'cancelEdit'});

  const toggleAction$ = domSource
    .select('.toggle').events('change')
    .map(ev => ev.target.checked)
    .map(payload => ({type: 'toggle', payload}));

  const destroyAction$ = domSource
    .select('.destroy').events('click')
    .mapTo({type: 'destroy'});

  return xs.merge(
    startEditAction$,
    doneEditAction$,
    cancelEditAction$,
    toggleAction$,
    destroyAction$
  );
}
