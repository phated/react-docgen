const { NodePath } = require('@motiz88/ast-types');

module.exports = {
  print(val, serialize) {
    return serialize(val.node);
  },

  test(val) {
    return val && val instanceof NodePath;
  },
};
