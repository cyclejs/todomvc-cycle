'use strict';
/*global Cycle */

Cycle.createRenderer('#todoapp').inject(TodosView);
LocalStorageSink.inject(TodosModel);
TodosIntent.inject(TodosView);
TodosView.inject(TodosModel);
TodosModel.inject(TodosIntent, TodosModelSource);
