'use strict';
/*global Cycle */

var ENTER_KEY = 13;
var ESC_KEY = 27;

var User = Cycle.createDOMUser('#todoapp');

LocalStorageSink.inject(TodosModel);
User.inject(TodosView);
TodosView.inject(TodosModel);
TodosModel.inject(TodosIntent, TodosModelSource);
TodosIntent.inject(User);
