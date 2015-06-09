class PropertyHook {
  constructor(fn) {
    this.fn = fn;
  }

  hook() {
    this.fn.apply(this, arguments);
  }
}

function propHook(fn) {
  return new PropertyHook(fn);
}

const ENTER_KEY = 13;
const ESC_KEY = 27;

export {propHook, ENTER_KEY, ESC_KEY};
