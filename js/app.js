'use strict';
/*global Cycle */

Cycle.renderEvery(TodosView.vtree$, '#todoapp');
TodosView.inject(TodosModel);
