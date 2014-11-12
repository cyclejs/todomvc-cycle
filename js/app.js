'use strict';
/*global Cycle */

Cycle.renderEvery(TodosView.vtree$, '#todoapp');
TodosIntent.inject(TodosView);
TodosView.inject(TodosModel);
TodosModel.inject(TodosIntent, InitialTodosModel);
