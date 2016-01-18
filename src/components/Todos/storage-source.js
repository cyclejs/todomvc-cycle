function merge() {
  let result = {};
  for (let i = 0; i < arguments.length; i++) {
    const object = arguments[i];
    for (let key in object) {
      if (object.hasOwnProperty(key)) {
        result[key] = object[key];
      }
    }
  }
  return result;
}

const safeJSONParse = str => JSON.parse(str) || {};

const mergeWithDefaultTodosData = todosData => {
  const defaultTodosData = {
    list: [],
    filter: '',
    filterFn: () => true // allow anything
  };
  return merge(defaultTodosData, todosData);
}

// Take localStorage todoData stream and transform into
// a JavaScript object. Set default data.
export default function deserialize(localStorageValue$) {
  return localStorageValue$
    .map(safeJSONParse)
    .map(mergeWithDefaultTodosData);
};
