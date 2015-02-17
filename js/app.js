'use strict';
/*global Cycle */

Cycle.createRenderer('#todoapp').inject(TodosView);
LocalStorageSink.inject(TodosModel);
TodosIntent.inject(TodosView);
TodosView.inject(TodosModel);
TodosModel.inject(TodosIntent, TodosModelSource);

/*
TODO

Turn renderer into User
create custom element for Todo
??

 */