'use strict';
/*global Cycle */

Cycle.createRenderer('#todoapp').inject(TodosView);
TodosIntent.inject(TodosView);
TodosView.inject(TodosModel);
TodosModel.inject(TodosIntent, InitialTodosModel);
