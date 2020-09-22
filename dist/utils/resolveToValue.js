"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = resolveToValue;

var _astTypes = require("ast-types");

var _getMemberExpressionRoot = _interopRequireDefault(require("./getMemberExpressionRoot"));

var _getPropertyValuePath = _interopRequireDefault(require("./getPropertyValuePath"));

var _expressionTo = require("./expressionTo");

var _traverse = require("./traverse");

var _getMemberValuePath = _interopRequireWildcard(require("./getMemberValuePath"));

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
function buildMemberExpressionFromPattern(path) {
  const node = path.node;

  if (_astTypes.namedTypes.Property.check(node)) {
    const objPath = buildMemberExpressionFromPattern(path.parent);

    if (objPath) {
      return new _astTypes.NodePath(_astTypes.builders.memberExpression(objPath.node, node.key, _astTypes.namedTypes.Literal.check(node.key)), objPath);
    }
  } else if (_astTypes.namedTypes.ObjectPattern.check(node)) {
    return buildMemberExpressionFromPattern(path.parent);
  } else if (_astTypes.namedTypes.VariableDeclarator.check(node)) {
    return path.get('init');
  }

  return null;
}

function findScopePath(paths, path, importer) {
  if (paths.length < 1) {
    return null;
  }

  let resultPath = paths[0];
  const parentPath = resultPath.parent; // Namespace imports are handled separately, at the site of a member expression access

  if (_astTypes.namedTypes.ImportDefaultSpecifier.check(parentPath.node) || _astTypes.namedTypes.ImportSpecifier.check(parentPath.node)) {
    let exportName;

    if (_astTypes.namedTypes.ImportDefaultSpecifier.check(parentPath.node)) {
      exportName = 'default';
    } else {
      exportName = parentPath.node.imported.name;
    }

    const resolvedPath = importer(parentPath.parentPath, exportName);

    if (resolvedPath) {
      return resolveToValue(resolvedPath, importer);
    }
  }

  if (_astTypes.namedTypes.ImportDefaultSpecifier.check(parentPath.node) || _astTypes.namedTypes.ImportSpecifier.check(parentPath.node) || _astTypes.namedTypes.ImportNamespaceSpecifier.check(parentPath.node) || _astTypes.namedTypes.VariableDeclarator.check(parentPath.node) || _astTypes.namedTypes.TypeAlias.check(parentPath.node) || _astTypes.namedTypes.InterfaceDeclaration.check(parentPath.node) || _astTypes.namedTypes.TSTypeAliasDeclaration.check(parentPath.node) || _astTypes.namedTypes.TSInterfaceDeclaration.check(parentPath.node)) {
    resultPath = parentPath;
  } else if (_astTypes.namedTypes.Property.check(parentPath.node)) {
    // must be inside a pattern
    const memberExpressionPath = buildMemberExpressionFromPattern(parentPath);

    if (memberExpressionPath) {
      return memberExpressionPath;
    }
  }

  if (resultPath.node !== path.node) {
    return resolveToValue(resultPath, importer);
  }

  return null;
}
/**
 * Tries to find the last value assigned to `name` in the scope created by
 * `scope`. We are not descending into any statements (blocks).
 */


function findLastAssignedValue(scope, idPath, importer) {
  const results = [];
  const name = idPath.node.name;
  (0, _traverse.traverseShallow)(scope.path, {
    visitAssignmentExpression: function (path) {
      const node = path.node; // Skip anything that is not an assignment to a variable with the
      // passed name.
      // Ensure the LHS isn't the reference we're trying to resolve.

      if (!_astTypes.namedTypes.Identifier.check(node.left) || node.left === idPath.node || node.left.name !== name || node.operator !== '=') {
        return this.traverse(path);
      } // Ensure the RHS doesn't contain the reference we're trying to resolve.


      const candidatePath = path.get('right');

      for (let p = idPath; p && p.node != null; p = p.parent) {
        if (p.node === candidatePath.node) {
          return this.traverse(path);
        }
      }

      results.push(candidatePath);
      return false;
    }
  });

  if (results.length === 0) {
    return null;
  }

  return resolveToValue(results.pop(), importer);
}
/**
 * If the path is an identifier, it is resolved in the scope chain.
 * If it is an assignment expression, it resolves to the right hand side.
 * If it is a member expression it is resolved to it's initialization value.
 *
 * Else the path itself is returned.
 */


function resolveToValue(path, importer) {
  const node = path.node;

  if (_astTypes.namedTypes.VariableDeclarator.check(node)) {
    if (node.init) {
      return resolveToValue(path.get('init'), importer);
    }
  } else if (_astTypes.namedTypes.MemberExpression.check(node)) {
    const root = (0, _getMemberExpressionRoot.default)(path);
    const resolved = resolveToValue(root, importer);

    if (_astTypes.namedTypes.ObjectExpression.check(resolved.node)) {
      let propertyPath = resolved;

      for (const propertyName of (0, _expressionTo.Array)(path, importer).slice(1)) {
        if (propertyPath && _astTypes.namedTypes.ObjectExpression.check(propertyPath.node)) {
          propertyPath = (0, _getPropertyValuePath.default)(propertyPath, propertyName, importer);
        }

        if (!propertyPath) {
          return path;
        }

        propertyPath = resolveToValue(propertyPath, importer);
      }

      return propertyPath;
    } else if ((0, _getMemberValuePath.isSupportedDefinitionType)(resolved)) {
      const memberPath = (0, _getMemberValuePath.default)(resolved, path.node.property.name, importer);

      if (memberPath) {
        return resolveToValue(memberPath, importer);
      }
    } else if (_astTypes.namedTypes.ImportDeclaration.check(resolved.node)) {
      // Handle references to namespace imports, e.g. import * as foo from 'bar'.
      // Try to find a specifier that matches the root of the member expression, and
      // find the export that matches the property name.
      for (const specifier of resolved.node.specifiers) {
        if (_astTypes.namedTypes.ImportNamespaceSpecifier.check(specifier) && specifier.local.name === root.node.name) {
          const resolvedPath = importer(resolved, root.parentPath.node.property.name);

          if (resolvedPath) {
            return resolveToValue(resolvedPath, importer);
          }
        }
      }
    }
  } else if (_astTypes.namedTypes.ImportDefaultSpecifier.check(node) || _astTypes.namedTypes.ImportNamespaceSpecifier.check(node) || _astTypes.namedTypes.ImportSpecifier.check(node)) {
    // go up two levels as first level is only the array of specifiers
    return path.parentPath.parentPath;
  } else if (_astTypes.namedTypes.AssignmentExpression.check(node)) {
    if (node.operator === '=') {
      return resolveToValue(path.get('right'), importer);
    }
  } else if (_astTypes.namedTypes.TypeCastExpression.check(node) || _astTypes.namedTypes.TSAsExpression.check(node) || _astTypes.namedTypes.TSTypeAssertion.check(node)) {
    return resolveToValue(path.get('expression'), importer);
  } else if (_astTypes.namedTypes.Identifier.check(node)) {
    if ((_astTypes.namedTypes.ClassDeclaration.check(path.parentPath.node) || _astTypes.namedTypes.ClassExpression.check(path.parentPath.node) || _astTypes.namedTypes.Function.check(path.parentPath.node)) && path.parentPath.get('id') === path) {
      return path.parentPath;
    }

    let scope = path.scope.lookup(node.name);
    let resolvedPath;

    if (scope) {
      // The variable may be assigned a different value after initialization.
      // We are first trying to find all assignments to the variable in the
      // block where it is defined (i.e. we are not traversing into statements)
      resolvedPath = findLastAssignedValue(scope, path, importer);

      if (!resolvedPath) {
        const bindings = scope.getBindings()[node.name];
        resolvedPath = findScopePath(bindings, path, importer);
      }
    } else {
      scope = path.scope.lookupType(node.name);

      if (scope) {
        const typesInScope = scope.getTypes()[node.name];
        resolvedPath = findScopePath(typesInScope, path, importer);
      }
    }

    return resolvedPath || path;
  }

  return path;
}