import {run} from '@cycle/xstream-run';
import {makeDOMDriver} from '@cycle/dom';
import storageDriver from '@cycle/storage';
import {makeHistoryDriver} from '@cycle/history'
import {createHistory} from 'history';
import onionify from 'cycle-onionify';
import storageify from "cycle-storageify";
import TaskList from './components/TaskList/index';

const main = onionify(storageify(TaskList, {key: 'todos-cycle'}));

run(main, {
  DOM: makeDOMDriver('.todoapp'),
  history: makeHistoryDriver(createHistory(), {capture: true}),
  storage: storageDriver,
});
