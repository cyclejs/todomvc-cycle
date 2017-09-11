import {ul} from '@cycle/dom';
import {makeCollection} from 'cycle-onionify';
import Task from '../Task/index';

export const List = makeCollection({
  item: Task,
  itemKey: state => state.key,
  itemScope: key => key,
  collectSinks: instances => ({
    DOM: instances.pickCombine('DOM')
      .map(vnodes => ul('.todo-list', vnodes)),
    onion: instances.pickMerge('onion'),
  })
});
