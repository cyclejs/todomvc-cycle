'use strict';
/*global Cycle */


var User = Cycle.createDOMUser('#todoapp');
LocalStorageSink.inject(TodosModel);
User.inject(TodosView);
TodosView.inject(TodosModel);
TodosModel.inject(TodosIntent, TodosModelSource);
TodosIntent.inject(User);

/*
TODO

create custom element for Todo
??

 */