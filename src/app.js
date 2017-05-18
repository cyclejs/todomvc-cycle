import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import storageDriver from '@cycle/storage';
import {captureClicks, makeHistoryDriver} from '@cycle/history'
import onionify from 'cycle-onionify';
import storageify from "cycle-storageify";
import TaskList from './components/TaskList/index';

const main = onionify(storageify(TaskList, {key: 'todos-cycle'}));

run(main, {
  DOM: makeDOMDriver('.todoapp'),
  history: captureClicks(makeHistoryDriver()),
  storage: storageDriver,
});
