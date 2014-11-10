'use strict';
/*global Cycle */

Cycle.renderEvery(TodosView.vtree$, '#todoapp');
Cycle.link(TodosModel, TodosView, TodosIntent);
